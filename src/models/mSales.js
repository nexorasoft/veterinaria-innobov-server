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
                        INSERT INTO clients (id, dni, name, phone, email, address, active)
                        VALUES (?, ?, ?, ?, ?, ?, 1);
                    `;
                    await tx.execute({
                        sql: insertClientSql,
                        args: [
                            finalClientId,
                            c.dni,
                            c.name.toUpperCase(),
                            c.phone,
                            c.email || null,
                            c.address || null
                        ]
                    });
                }
            }

            if (!finalClientId) { 
                return { 
                    success: false,
                    code: 400,
                    message: 'Client information is required to register a sale.',
                    data: null
                }
            };

            let currentShiftId = null;

            const shiftCheck = await tx.execute({
                sql: "SELECT id FROM cash_shifts WHERE user_id = ? AND status = 'ABIERTA'",
                args: [saleData.user_id]
            });

            if (shiftCheck.rows.length === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 400,
                    message: 'No open cash shift found for the user.',
                    data: null
                };
            }

            currentShiftId = shiftCheck.rows[0].id;

            const insertSaleSql = `
                INSERT INTO sales (
                    id, client_id, user_id, 
                    subtotal, tax, discount, total, 
                    payment_method, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            await tx.execute({
                sql: insertSaleSql,
                args: [
                    saleData.id, finalClientId, saleData.user_id,
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
                        item.sale_detail_id, saleData.id, item.item_type,
                        item.product_id || null, item.service_id || null,
                        item.quantity, item.price, item.subtotal
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
                    saleData.cash_movement_id, currentShiftId, saleData.user_id,
                    'INGRESO', 'VENTA', `Venta #${saleData.id.slice(0, 8)}`,
                    saleData.total, saleData.id
                ]
            });

            console.log('Insert Cash Movement SQL executed');


            await tx.commit();
            logger.info('Sale registered successfully', { saleId: saleData.id });

            return {
                success: true,
                code: 201,
                message: 'Sale registered successfully',
                data: { sale_id: saleData.id }
            };
        } catch (error) {
            await tx.rollback();
            logger.error('mSales.registerSale: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while registering the sale: ' + error.message,
                data: null
            };
        }
    },

}