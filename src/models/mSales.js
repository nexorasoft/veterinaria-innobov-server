import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';

export const mSales = {
    async searchCatalog(term) {
        try {
            const searchTerm = term.trim();
            const query = `
                SELECT 
                    id, 
                    code, 
                    name, 
                    description,
                    sale_price as price, 
                    stock, 
                    taxable,
                    'PRODUCTO' as item_type 
                FROM products 
                WHERE active = 1 
                AND (name LIKE '%' || ? || '%' OR code LIKE '%' || ? || '%')

                UNION ALL

                SELECT 
                    id, 
                    code, 
                    name, 
                    description,
                    price, 
                    NULL as stock, -- Servicios no tienen stock
                    taxable,
                    'SERVICIO' as item_type
                FROM services 
                WHERE active = 1 
                AND (name LIKE '%' || ? || '%' OR code LIKE '%' || ? || '%')
                
                LIMIT 20;
            `;

            const args = [searchTerm, searchTerm, searchTerm, searchTerm];

            const result = await turso.execute({
                sql: query,
                args: args
            })

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Not found any matching products or services.',
                    data: null
                };
            };

            return {
                success: true,
                code: 200,
                message: 'Search completed successfully.',
                data: result.rows
            }
        } catch (error) {
            logger.error('mSales.searchCatalog: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while searching the catalog.',
                data: null
            };
        }
    },

    async registerSale(saleData) {
        const tx = await turso.transaction();

        try {
            let finalClientId = saleData.client_id;

            if (!finalClientId && saleData.client_data) {
                const c = saleData.client_data;

                const checkClient = await tx.execute({
                    sql: "SELECT id FROM clients WHERE dni = ?",
                    args: [c.dni]
                });

                if (checkClient.rows.length > 0) {
                    finalClientId = checkClient.rows[0].id;
                } else {
                    finalClientId = uuidv4();
                    const insertClientSql = `
                        INSERT INTO clients (id, dni, name, phone, email, address, active, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now', '-5 hours'));
                    `;
                    await tx.execute({
                        sql: insertClientSql,
                        args: [
                            finalClientId,
                            c.dni,
                            c.name.toUpperCase(),
                            c.phone || null,
                            c.email || null,
                            c.address || null
                        ]
                    });
                }
            }

            if (!finalClientId) {
                await tx.rollback();
                return { success: false, code: 400, message: 'La información del cliente es obligatoria.', data: null };
            };

            let currentShiftId = null;

            const shiftCheck = await tx.execute({
                sql: "SELECT id FROM cash_shifts WHERE user_id = ? AND status = 'ABIERTA'",
                args: [saleData.user_id]
            });

            if (shiftCheck.rows.length > 0) {
                currentShiftId = shiftCheck.rows[0].id;
            }

            if (saleData.payment_method === 'EFECTIVO' && !currentShiftId) {
                await tx.rollback();
                return { success: false, code: 400, message: 'Para cobrar en EFECTIVO debes abrir caja primero.', data: null };
            }

            const insertSaleSql = `
                INSERT INTO sales (
                    id, client_id, user_id, 
                    subtotal, tax, discount, total, 
                    payment_method, status, notes, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'));
            `;

            await tx.execute({
                sql: insertSaleSql,
                args: [
                    saleData.id,
                    finalClientId,
                    saleData.user_id,
                    saleData.subtotal, saleData.tax, saleData.discount, saleData.total,
                    saleData.payment_method, 'EMITIDA', saleData.notes
                ]
            });

            for (const item of saleData.items) {
                const insertDetailSql = `
                    INSERT INTO sale_details (
                        id, sale_id, item_type, product_id, service_id, 
                        quantity, price, subtotal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                `;

                await tx.execute({
                    sql: insertDetailSql,
                    args: [
                        item.sale_detail_id,
                        saleData.id,
                        item.item_type,
                        item.product_id || null,
                        item.service_id || null,
                        item.quantity,
                        item.price,
                        item.total_line
                    ]
                });

                if (item.item_type === 'PRODUCTO' && item.product_id) {
                    const updateStockSql = `
                        UPDATE products 
                        SET stock = stock - ? 
                        WHERE id = ? AND stock >= ?;
                    `;

                    const stockResult = await tx.execute({
                        sql: updateStockSql,
                        args: [item.quantity, item.product_id, item.quantity]
                    });

                    if (stockResult.rowsAffected === 0) {
                        throw new Error(`Stock insuficiente para el producto ID: ${item.product_id}`);
                    }
                }
            }

            if (saleData.payment_method === 'EFECTIVO') {
                const movementSql = `
                    INSERT INTO cash_movements (
                        id, cash_shift_id, user_id, 
                        type, category, concept, 
                        amount, sale_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'));
                `;

                await tx.execute({
                    sql: movementSql,
                    args: [
                        uuidv4(),
                        currentShiftId,
                        saleData.user_id,
                        'INGRESO', 'VENTA', `Venta Contado #${saleData.id.slice(0, 6)}`,
                        saleData.total,
                        saleData.id
                    ]
                });
            }

            else if (saleData.payment_method === 'TRANSFERENCIA') {
                const movementSql = `
                    INSERT INTO cash_movements (
                        id, cash_shift_id, user_id, 
                        type, category, concept, 
                        amount, sale_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'));
                `;

                await tx.execute({
                    sql: movementSql,
                    args: [
                        uuidv4(),
                        currentShiftId,
                        saleData.user_id,
                        'INGRESO', 'VENTA', `Transferencia Banco #${saleData.id.slice(0, 6)}`,
                        saleData.total,
                        saleData.id
                    ]
                });
            }

            else if (saleData.payment_method === 'CREDITO') {
                const daysToPay = saleData.days_to_pay || 30;

                const receivableSql = `
                    INSERT INTO accounts_receivable (
                        id, client_id, sale_id, 
                        amount, amount_paid, balance, 
                        due_date, status, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, 
                        ?, 0, ?, 
                        date('now', '+${daysToPay} days'), 'PENDIENTE', 
                        datetime('now', '-5 hours'), datetime('now', '-5 hours')
                    );
                `;

                await tx.execute({
                    sql: receivableSql,
                    args: [
                        uuidv4(),
                        finalClientId,
                        saleData.id,
                        saleData.total,
                        saleData.total
                    ]
                });
            }

            await tx.commit();
            logger.info('Sale registered successfully', { saleId: saleData.id });

            return {
                success: true,
                code: 201,
                message: 'Venta registrada correctamente',
                data: { sale_id: saleData.id }
            };

        } catch (error) {
            await tx.rollback();

            if (error.message.includes('Stock insuficiente')) {
                return { success: false, code: 409, message: error.message, data: null };
            }

            logger.error('mSales.registerSale error: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'Error al registrar la venta: ' + error.message,
                data: null
            };
        }
    }

}