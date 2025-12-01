import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mPurchase = {
    async getSupplierById(supplierId) {
        try {
            const query = `
                SELECT *
                FROM suppliers
                WHERE id = ? and active = 1;
            `;

            const result = await turso.execute({
                sql: query,
                args: [supplierId]
            });

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error('Error retrieving supplier by ID:', error);
            return null;
        }
    },

    async getProductById(productId) {
        try {
            const query = `
                SELECT *
                FROM products
                WHERE id = ?
            `;

            const result = await turso.execute({
                sql: query,
                args: [productId]
            });

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error('Error retrieving product by ID:', error);
            return null;
        }
    },

    async getProductsByIds(productIds) {
        try {
            const placeholders = productIds.map(() => '?').join(',');
            const query = `
                SELECT *
                FROM products
                WHERE id IN (${placeholders})
            `;

            const result = await turso.execute({
                sql: query,
                args: productIds
            });

            return result.rows.length > 0 ? result.rows : null;
        } catch (error) {
            logger.error('Error retrieving products by IDs:', error);
            return null;
        }
    },

    async calculateDaysUntilExpiry(expiryDate) {
        try {
            const query = `
                SELECT julianday(?) - julianday('now', '-5 hours') as days
            `;

            const result = await turso.execute({
                sql: query,
                args: [expiryDate]
            });

            return result.rows[0]?.days || null;
        } catch (error) {
            logger.error('Error calculating days until expiry:', error);
            return null;
        }
    },

    async getPurchaseWithDetails(purchaseId) {
        try {
            const purchaseQuery = `
                SELECT 
                    p.*,
                    s.name as supplier_name,
                    s.ruc as supplier_ruc
                FROM purchases p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.id = ?
            `;

            const detailsQuery = `
                SELECT 
                    pd.*,
                    pr.name as product_name,
                    pr.code as product_code,
                    pr.stock as new_stock
                FROM purchase_details pd
                JOIN products pr ON pd.product_id = pr.id
                WHERE pd.purchase_id = ?
            `;

            const purchaseResult = await turso.execute({
                sql: purchaseQuery,
                args: [purchaseId]
            });

            if (purchaseResult.rows.length === 0) {
                return null;
            }

            const detailsResult = await turso.execute({
                sql: detailsQuery,
                args: [purchaseId]
            });

            const purchase = purchaseResult.rows[0];
            purchase.details = detailsResult.rows;

            return purchase;
        } catch (error) {
            logger.error('Error retrieving purchase with details:', error);
            return null;
        }
    },

    async createPurchaseTransaction(transactionData) {
        try {
            const {
                purchaseId,
                supplier_id,
                user_id,
                subtotal,
                tax,
                discount,
                total,
                payment_method,
                status,
                due_date,
                notes,
                validatedItems,
                newProducts,
                supplierName,
                cashMovementId,  
                accountPayableId,
                cashShiftId     
            } = transactionData;

            const batchStatements = [];

            if (newProducts && newProducts.length > 0) {
                const insertProductQuery = `
                    INSERT INTO products (
                        id, category_id, supplier_id, code, name, description,
                        purchase_price, sale_price, wholesale_price, stock, min_stock,
                        max_stock, unit, is_medicine, requires_prescription,
                        active_ingredient, concentration, expiration_date, batch_number,
                        active, taxable
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                for (const product of newProducts) {
                    batchStatements.push({
                        sql: insertProductQuery,
                        args: [
                            product.id,
                            product.category_id,
                            product.supplier_id,
                            product.code || null,
                            product.name,
                            product.description || null,
                            product.purchase_price,
                            product.sale_price,
                            product.wholesale_price || null,
                            product.stock,
                            product.min_stock || 1,
                            product.max_stock || null,
                            product.unit,
                            product.is_medicine || 0,
                            product.requires_prescription || 0,
                            product.active_ingredient || null,
                            product.concentration || null,
                            product.expiration_date || null,
                            product.batch_number || null,
                            1,
                            product.taxable !== undefined ? product.taxable : 1
                        ]
                    });
                }
            }

            const insertPurchaseQuery = `
                INSERT INTO purchases (
                    id, supplier_id, user_id, subtotal, tax, 
                    discount, total, payment_method, status, 
                    due_date, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'))
            `;

            batchStatements.push({
                sql: insertPurchaseQuery,
                args: [
                    purchaseId, supplier_id, user_id, subtotal, tax,
                    discount || 0, total, payment_method, status,
                    due_date || null, notes || null
                ]
            });

            const insertDetailQuery = `
                INSERT INTO purchase_details (
                    id, purchase_id, product_id, quantity, 
                    price, subtotal, expiration_date, batch_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const updateProductStockQuery = `
                UPDATE products 
                SET 
                    stock = stock + ?,
                    purchase_price = ?, -- Actualizamos costo al nuevo precio
                    expiration_date = COALESCE(?, expiration_date),
                    batch_number = COALESCE(?, batch_number),
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?
            `;

            for (const item of validatedItems) {
                batchStatements.push({
                    sql: insertDetailQuery,
                    args: [
                        item.detail_id, purchaseId, item.product_id, item.quantity,
                        item.price, item.subtotal, item.expiration_date || null, item.batch_number || null
                    ]
                });

                if (!item.is_new_product) {
                    batchStatements.push({
                        sql: updateProductStockQuery,
                        args: [
                            item.quantity,
                            item.price,
                            item.expiration_date || null,
                            item.batch_number || null,
                            item.product_id
                        ]
                    });
                }
            }


            if (status === 'PAGADA') {
                const finalShiftId = (payment_method === 'EFECTIVO') ? cashShiftId : null;

                batchStatements.push({
                    sql: `
                        INSERT INTO cash_movements (
                            id, user_id, type, category, concept, 
                            amount, purchase_id, cash_shift_id, created_at
                        ) VALUES (?, ?, 'EGRESO', 'COMPRA', ?, ?, ?, ?, datetime('now', '-5 hours'))
                    `,
                    args: [
                        cashMovementId,
                        user_id,
                        `Compra a ${supplierName} (${payment_method})`,
                        total,
                        purchaseId,
                        finalShiftId
                    ]
                });
            }

            else if (status === 'PENDIENTE' || payment_method === 'CREDITO') {
                batchStatements.push({
                    sql: `
                        INSERT INTO accounts_payable (
                            id, supplier_id, purchase_id, amount, 
                            amount_paid, balance, due_date, status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, 0, ?, ?, 'PENDIENTE', datetime('now', '-5 hours'), datetime('now', '-5 hours'))
                    `,
                    args: [
                        accountPayableId,
                        supplier_id,
                        purchaseId,
                        total,
                        total,
                        due_date || null
                    ]
                });
            }

            await turso.batch(batchStatements, 'write');

            logger.info('Purchase transaction created successfully', { purchaseId });
            return {
                success: true,
                code: 201,
                message: 'Compra registrada correctamente',
                data: { purchaseId }
            };

        } catch (error) {
            logger.error('Error creating purchase transaction', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error al registrar la compra',
                data: null
            };
        }
    },

    async getPurchases(filterParams) {
        try {
            const {
                status,
                supplier_id,
                from_date,
                to_date,
                today,
                page = 1,
                limit = 10
            } = filterParams;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            let query = `
            SELECT 
                p.id AS purchase_id,
                p.created_at AS purchase_date,
                p.total AS purchase_total,
                p.status AS purchase_status,
                p.payment_method AS purchase_payment_method,
                COALESCE(p.due_date, 'Sin fecha de vencimiento') AS purchase_due_date,
                COALESCE(p.notes, 'Sin notas') AS purchase_notes,
                s.name AS supplier_name,
                COUNT(pd.id) AS total_items,
                SUM(pd.quantity) AS total_quantity,
                COUNT(*) OVER() as total_count
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN purchase_details pd ON p.id = pd.purchase_id
            WHERE 1=1
        `;

            const args = [];

            if (supplier_id !== undefined && supplier_id !== null && supplier_id !== '') {
                query += ` AND p.supplier_id = ?`;
                args.push(supplier_id);
            }

            if (status !== undefined && status !== null && status !== '') {
                query += ` AND p.status = ?`;
                args.push(status);
            }

            if (from_date) {
                query += ` AND DATE(p.created_at) >= ?`;
                args.push(from_date);
            }

            if (to_date) {
                query += ` AND DATE(p.created_at) <= ?`;
                args.push(to_date);
            }

            if (today === "true") {
                query += " AND DATE(p.created_at) = DATE('now', '-5 hours') ";
            }

            query += `
            GROUP BY 
                p.id,
                p.created_at,
                p.total,
                p.status,
                p.payment_method,
                purchase_due_date,
                purchase_notes,
                s.name
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;

            args.push(limitNum, offset);

            const result = await turso.execute({ sql: query, args });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No purchases found matching the search criteria',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const purchases = result.rows.map(({ total_count, ...purchase }) => purchase);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Purchases fetched successfully',
                data: {
                    purchases,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error fetching purchases', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching purchases',
                data: null
            };
        }
    },

    async getDetailsPurchaseById(purchaseId) {
        try {
            const query = `
            SELECT 
                p.id,
                p.supplier_id,
                p.user_id,
                p.subtotal,
                p.tax,
                p.discount,
                p.total,
                p.payment_method,
                p.status,
                p.invoice_number,
                p.due_date,
                p.notes,
                p.created_at,
                p.updated_at,
                s.name as supplier_name,
                s.ruc as supplier_ruc,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address,
                s.contact_person as supplier_contact_person,
                s.payment_terms as supplier_payment_terms,
                pd.id as detail_id,
                pd.product_id,
                pd.quantity,
                pd.price,
                pd.discount as detail_discount,
                pd.subtotal as detail_subtotal,
                pd.expiration_date as detail_expiration_date,
                pd.batch_number as detail_batch_number,
                prod.name as product_name,
                prod.code as product_code,
                prod.stock as current_stock,
                prod.unit as product_unit,
                c.name as category_name
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN purchase_details pd ON p.id = pd.purchase_id
            LEFT JOIN products prod ON pd.product_id = prod.id
            LEFT JOIN categories c ON prod.category_id = c.id
            WHERE p.id = ?
            ORDER BY prod.name
        `;

            const result = await turso.execute({
                sql: query,
                args: [purchaseId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Purchase not found',
                    data: null
                };
            }

            // Construir el objeto de respuesta agrupando los detalles
            const firstRow = result.rows[0];
            const purchase = {
                id: firstRow.id,
                supplier_id: firstRow.supplier_id,
                user_id: firstRow.user_id,
                subtotal: firstRow.subtotal,
                tax: firstRow.tax,
                discount: firstRow.discount,
                total: firstRow.total,
                payment_method: firstRow.payment_method,
                status: firstRow.status,
                invoice_number: firstRow.invoice_number,
                due_date: firstRow.due_date,
                notes: firstRow.notes,
                created_at: firstRow.created_at,
                updated_at: firstRow.updated_at,
                supplier_name: firstRow.supplier_name,
                supplier_ruc: firstRow.supplier_ruc,
                supplier_phone: firstRow.supplier_phone,
                supplier_email: firstRow.supplier_email,
                supplier_address: firstRow.supplier_address,
                supplier_contact_person: firstRow.supplier_contact_person,
                supplier_payment_terms: firstRow.supplier_payment_terms,
                details: []
            };

            // Agregar los detalles si existen
            if (firstRow.detail_id) {
                purchase.details = result.rows.map(row => ({
                    id: row.detail_id,
                    product_id: row.product_id,
                    quantity: row.quantity,
                    price: row.price,
                    discount: row.detail_discount,
                    subtotal: row.detail_subtotal,
                    expiration_date: row.detail_expiration_date,
                    batch_number: row.detail_batch_number,
                    product_name: row.product_name,
                    product_code: row.product_code,
                    current_stock: row.current_stock,
                    product_unit: row.product_unit,
                    category_name: row.category_name
                }));
            }

            return {
                success: true,
                code: 200,
                message: 'Purchase details fetched successfully',
                data: purchase
            };
        } catch (error) {
            logger.error('Error fetching purchase details by ID', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching purchase details',
                data: null
            };
        }
    },
};