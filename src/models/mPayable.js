import { turso } from "../database/index.js";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "../utils/logger.js";

export const mPayable = {
    async getAllPayables(filters) {
        try {
            const { search, supplier_name, status, start_date, end_date, page, limit } = filters;
            const searchTerm = search || supplier_name;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offset = (pageNum - 1) * limitNum;

            const args = [];
            const conditions = [];

            if (status && status !== 'TODOS') {
                if (status === 'PENDIENTE') {
                    conditions.push("ap.status IN ('PENDIENTE', 'VENCIDO')");
                } else if (status === 'PAGADO_PARCIAL') {
                    conditions.push("ap.status = 'PAGADO_PARCIAL'");
                } else if (status === 'PAGADO') {
                    conditions.push("ap.status = 'PAGADO'");
                } else if (status === 'VENCIDO') {
                    conditions.push("ap.status = 'VENCIDO'");
                } else if (status === 'ACTIVOS') {
                    conditions.push("ap.status != 'PAGADO'");
                }
            }

            if (searchTerm) {
                conditions.push("(s.name LIKE '%' || ? || '%' OR s.ruc LIKE '%' || ? || '%')");
                args.push(searchTerm, searchTerm);
            }

            if (start_date) {
                conditions.push("DATE(ap.created_at) >= DATE(?)");
                args.push(start_date);
            }

            if (end_date) {
                conditions.push("DATE(ap.created_at) <= DATE(?)");
                args.push(end_date);
            }

            const whereClause = conditions.length > 0
                ? "WHERE " + conditions.join(" AND ")
                : "";

            const query = `
                SELECT 
                    ap.id,
                    ap.created_at as emission_date,
                    ap.due_date,
                    s.name as supplier_name,
                    s.ruc as supplier_ruc,
                    p.invoice_number,
                    ap.amount as total_original,
                    ap.balance as current_debt,
                    ap.status,
                    CASE 
                        WHEN ap.due_date IS NULL THEN NULL
                        WHEN DATE(ap.due_date) < DATE('now') 
                        THEN CAST(julianday('now') - julianday(ap.due_date) AS INTEGER)
                        ELSE 0
                    END as days_overdue,
                    CASE 
                        WHEN ap.due_date IS NULL THEN NULL
                        WHEN DATE(ap.due_date) >= DATE('now') 
                        THEN CAST(julianday(ap.due_date) - julianday('now') AS INTEGER)
                        ELSE 0
                    END as days_until_due,
                    COUNT(*) OVER() as total_count
                FROM accounts_payable ap
                JOIN suppliers s ON ap.supplier_id = s.id
                LEFT JOIN purchases p ON ap.purchase_id = p.id
                ${whereClause}
                ORDER BY 
                    CASE ap.status
                        WHEN 'VENCIDO' THEN 1
                        WHEN 'PAGADO_PARCIAL' THEN 2
                        WHEN 'PENDIENTE' THEN 3
                        WHEN 'PAGADO' THEN 4
                    END,
                    ap.due_date ASC
                LIMIT ? OFFSET ?;
            `;

            args.push(limitNum, offset);
            const result = await turso.execute({
                sql: query,
                args: args
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No payables found matching the criteria.',
                    data: null
                };
            }

            const totalCount = result.rows[0].total_count;
            const payables = result.rows.map(({ total_count, ...payable }) => ({
                ...payable,
                days_overdue: payable.days_overdue === null ? null : (payable.days_overdue || 0),
                days_until_due: payable.days_until_due === null ? null : (payable.days_until_due || 0)
            }));

            const totalPages = Math.ceil(totalCount / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Payables retrieved successfully',
                data: {
                    payables,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };

        } catch (error) {
            logger.error('Error fetching payables:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getPayableById(id) {
        try {
            const query = `
                SELECT 
                    ap.id,
                    ap.amount,
                    ap.amount_paid,
                    ap.balance,
                    ap.status,
                    ap.due_date,
                    ap.created_at,
                    -- Proveedor
                    s.id as supplier_id,
                    s.name as supplier_name,
                    s.ruc as supplier_ruc,
                    s.phone as supplier_phone,
                    -- Compra Original
                    p.id as purchase_id,
                    p.invoice_number,
                    p.total as purchase_total
                FROM accounts_payable ap
                JOIN suppliers s ON ap.supplier_id = s.id
                LEFT JOIN purchases p ON ap.purchase_id = p.id
                WHERE ap.id = ?;
            `;

            const result = await turso.execute({ sql: query, args: [id] });

            if (result.rows.length === 0) {
                return { success: false, code: 404, message: 'Deuda no encontrada', data: null };
            }

            return {
                success: true,
                code: 200,
                data: result.rows[0]
            };
        } catch (error) {
            logger.error('Error fetching payable detail', error);
            return { success: false, code: 500, message: 'Error interno' };
        }
    },

    async registerPayment(paymentData) {
        const tx = await turso.transaction();
        try {
            const {
                payable_id,
                amount,
                payment_method,
                notes,
                user_id,
                cash_shift_id
            } = paymentData;

            const checkSql = `SELECT balance, supplier_id FROM accounts_payable WHERE id = ?`;
            const checkRes = await tx.execute({ sql: checkSql, args: [payable_id] });

            if (checkRes.rows.length === 0) {
                await tx.rollback();
                return { success: false, code: 404, message: 'La cuenta por pagar no existe', data: null };
            }

            const currentBalance = checkRes.rows[0].balance;

            if (amount > (currentBalance + 0.01)) {
                await tx.rollback();
                return {
                    success: false,
                    code: 400,
                    message: `El monto ingresado ($${amount}) supera la deuda actual ($${currentBalance})`
                };
            }

            const newBalance = currentBalance - amount;
            const newStatus = newBalance <= 0.01 ? 'PAGADO' : 'PAGADO_PARCIAL';

            const updateApSql = `
                UPDATE accounts_payable 
                SET amount_paid = amount_paid + ?, 
                    balance = ?, 
                    status = ?, 
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            await tx.execute({
                sql: updateApSql,
                args: [amount, newBalance, newStatus, payable_id]
            });

            const movementSql = `
                INSERT INTO cash_movements (
                    id, user_id, type, category, concept, amount, 
                    cash_shift_id, reference_number, notes, created_at
                ) VALUES (?, ?, 'EGRESO', 'COMPRA', ?, ?, ?, ?, ?, datetime('now', '-5 hours'));
            `;

            const concept = `Pago a proveedor (${payment_method})`;

            await tx.execute({
                sql: movementSql,
                args: [
                    uuidv4(),
                    user_id,
                    concept,
                    amount,
                    cash_shift_id,
                    payable_id,
                    notes || null
                ]
            });

            await tx.commit();

            logger.info('Supplier payment registered', { payableId: payable_id, amount });

            return {
                success: true,
                code: 201,
                message: 'Pago registrado correctamente',
                data: {
                    new_balance: parseFloat(newBalance.toFixed(2)),
                    status: newStatus
                }
            };

        } catch (error) {
            await tx.rollback();
            logger.error('Error registering supplier payment', error);
            return { success: false, code: 500, message: 'Error interno al registrar el pago', data: null };
        }
    },

    async getPaymentHistory(payableId) {
        try {
            const query = `
                SELECT 
                    id,
                    amount,
                    concept,
                    notes,
                    created_at,
                    user_id
                FROM cash_movements
                WHERE reference_number = ? AND category = 'COMPRA'
                ORDER BY created_at DESC;
            `;

            const result = await turso.execute({ sql: query, args: [payableId] });

            if (result.rows.length === 0) {
                return { success: false, code: 404, message: 'No se encontraron pagos para esta deuda', data: null };
            }

            return {
                success: true,
                code: 200,
                message: 'Historial de pagos obtenido correctamente',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching history', error);
            return { success: false, code: 500, message: 'Error obteniendo historial', data: null };
        }
    }
};