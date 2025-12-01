import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mReceivable = {
    async getAllReceivables(filters) {
        try {
            const {
                search, client_name, status, start_date,
                end_date, page, limit
            } = filters;

            const searchTerm = search || client_name;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offset = (pageNum - 1) * limitNum;

            const args = [];
            const conditions = []; // Cambiado a array de condiciones

            // Filtro de estado
            if (status && status !== 'TODOS') {
                if (status === 'PENDIENTE') {
                    conditions.push("ar.status IN ('PENDIENTE', 'VENCIDO')");
                } else if (status === 'PAGADO_PARCIAL') {
                    conditions.push("ar.status = 'PAGADO_PARCIAL'");
                } else if (status === 'PAGADO') {
                    conditions.push("ar.status = 'PAGADO'");
                } else if (status === 'VENCIDO') {
                    conditions.push("ar.status = 'VENCIDO'");
                } else if (status === 'ACTIVOS') {
                    conditions.push("ar.status != 'PAGADO'");
                }
            }

            // Filtro de búsqueda
            if (searchTerm) {
                conditions.push("(c.name LIKE '%' || ? || '%' OR c.dni LIKE '%' || ? || '%')");
                args.push(searchTerm, searchTerm);
            }

            // Filtro de fecha inicio - CORREGIDO
            if (start_date) {
                conditions.push("DATE(ar.created_at) >= DATE(?)");
                args.push(start_date);
            }

            // Filtro de fecha fin - CORREGIDO
            if (end_date) {
                conditions.push("DATE(ar.created_at) <= DATE(?)");
                args.push(end_date);
            }

            // Construir WHERE clause
            const whereClause = conditions.length > 0
                ? "WHERE " + conditions.join(" AND ")
                : "";

            const query = `
            SELECT 
                ar.id,
                ar.created_at as emission_date,
                ar.due_date,
                c.id as client_id,
                c.name as client_name,
                c.dni as client_dni,
                ar.amount as total_original,
                ar.balance as current_debt,
                ar.status,
                CASE 
                    WHEN ar.due_date IS NULL THEN NULL
                    WHEN DATE(ar.due_date) < DATE('now') 
                    THEN CAST(julianday('now') - julianday(ar.due_date) AS INTEGER)
                    ELSE 0
                END as days_overdue,
                CASE 
                    WHEN ar.due_date IS NULL THEN NULL
                    WHEN DATE(ar.due_date) >= DATE('now') 
                    THEN CAST(julianday(ar.due_date) - julianday('now') AS INTEGER)
                    ELSE 0
                END as days_until_due,
                COUNT(*) OVER() as total_count
            FROM accounts_receivable ar
            JOIN clients c ON ar.client_id = c.id
            ${whereClause}
            ORDER BY 
                CASE ar.status
                    WHEN 'VENCIDO' THEN 1
                    WHEN 'PAGADO_PARCIAL' THEN 2
                    WHEN 'PENDIENTE' THEN 3
                    WHEN 'PAGADO' THEN 4
                END,
                ar.due_date ASC
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
                    message: 'No receivables found with the given criteria.',
                    data: null
                };
            }

            const totalCount = result.rows[0].total_count;
            const receivables = result.rows.map(({ total_count, ...receivable }) => ({
                ...receivable,
                days_overdue: receivable.days_overdue === null ? null : (receivable.days_overdue || 0),
                days_until_due: receivable.days_until_due === null ? null : (receivable.days_until_due || 0)
            }));

            const totalPages = Math.ceil(totalCount / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Receivables retrieved successfully.',
                data: {
                    receivables,
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
            logger.error('mReceivable.getAllReceivables: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving receivables.',
                data: null
            };
        }
    },

    async registerPayment(paymentData) {
        try {
            const tx = await turso.transaction();
            const {
                receivable_id,
                amount,
                cash_movement_id,
                payment_method,
                notes,
                user_id,
                cash_shift_id
            } = paymentData;

            const checkSql = `SELECT balance, client_id FROM accounts_receivable WHERE id = ?`;
            const checkRes = await tx.execute({ sql: checkSql, args: [receivable_id] });

            if (checkRes.rows.length === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 404,
                    message: 'Receivable not found.',
                    data: null
                };
            }

            const currentBalance = checkRes.rows[0].balance;

            if (amount > currentBalance) {
                await tx.rollback();
                return {
                    success: false,
                    code: 400,
                    message: `The amount ($${amount}) exceeds the current balance ($${currentBalance})`,
                    data: null
                };
            }

            const newBalance = currentBalance - amount;
            const newStatus = newBalance <= 0.01 ? 'PAGADO' : 'PAGADO_PARCIAL';

            const updateArSql = `
                    UPDATE accounts_receivable 
                    SET amount_paid = amount_paid + ?, 
                        balance = ?, 
                        status = ?, 
                        updated_at = datetime('now', '-5 hours')
                    WHERE id = ?;
                `;

            await tx.execute({
                sql: updateArSql,
                args: [amount, newBalance, newStatus, receivable_id]
            });

            const movementSql = `
                    INSERT INTO cash_movements (
                        id, user_id, type, category, concept, amount, 
                        cash_shift_id, reference_number, notes, created_at
                    ) VALUES (?, ?, 'INGRESO', 'COBRO_DEUDA', ?, ?, ?, ?, ?, datetime('now', '-5 hours'));
                `;

            const concept = `Payment to debt (${payment_method}) - Balance: $${newBalance.toFixed(2)}`;

            await tx.execute({
                sql: movementSql,
                args: [
                    cash_movement_id,
                    user_id,
                    concept,
                    amount,
                    cash_shift_id || null,
                    receivable_id,
                    notes
                ]
            });

            await tx.commit();
            return {
                success: true,
                code: 201,
                message: 'Payment registered successfully',
                data: { new_balance: newBalance, status: newStatus }
            };
        } catch (error) {
            logger.error('mReceivable.registerPayment: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while registering the payment.',
                data: null
            };
        }
    },

    async getPaymentHistory(receivable_id) {
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
                WHERE reference_number = ? AND category = 'COBRO_DEUDA'
                ORDER BY created_at DESC;
            `;

            const result = await turso.execute({ sql: query, args: [receivable_id] });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No payment history found for the given receivable ID.',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Payment history retrieved successfully.',
                data: result.rows
            };
        } catch (error) {
            logger.error('mReceivable.getPaymentHistory: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving the payment history.',
                data: null
            };
        }
    },

    async getReceivableById(id) {
        try {
            const query = `
                SELECT 
                    ar.id,
                    ar.amount as original_amount,
                    ar.amount_paid,
                    ar.balance,
                    ar.status,
                    ar.created_at,
                    ar.due_date,
                    ar.notes,
                    -- Datos del Cliente
                    c.id as client_id,
                    c.name as client_name,
                    c.dni as client_dni,
                    c.phone as client_phone,
                    -- Datos de la Venta Origen
                    s.id as sale_id,
                    s.total as sale_total
                FROM accounts_receivable ar
                JOIN clients c ON ar.client_id = c.id
                LEFT JOIN sales s ON ar.sale_id = s.id
                WHERE ar.id = ?;
            `;

            const result = await turso.execute({ sql: query, args: [id] });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Receivable not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Receivable detail fetched successfully',
                data: result.rows[0]
            };
        } catch (error) {
            logger.error('Error fetching receivable detail', error);
            return { success: false, code: 500, message: 'Internal error', data: null };
        }
    },
};