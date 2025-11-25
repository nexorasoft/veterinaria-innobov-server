import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mSupplier = {
    async createSupplier(supplierData) {
        try {
            const query = `
                INSERT INTO suppliers (
                    id, name, ruc, phone, email,
                    address, contact_person, payment_terms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    supplierData.id,
                    supplierData.name,
                    supplierData.ruc,
                    supplierData.phone,
                    supplierData.email || null,
                    supplierData.address || null,
                    supplierData.contact_person || null,
                    supplierData.payment_terms || null
                ]
            });

            if (result.rowsAffected > 0) {
                return {
                    success: true,
                    code: 201,
                    message: 'Supplier created successfully',
                    data: supplierData
                };
            } else {
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create supplier',
                    data: null
                };
            }
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Supplier creation failed: Duplicate name', { name: supplierData.ruc });
                return {
                    success: false,
                    code: 409,
                    message: 'A supplier with this RUC already exists',
                    data: null
                };
            }

            logger.error('Error creating supplier', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating supplier',
                data: null
            };
        }
    },

    async getSuppliers(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM suppliers;
            `;

            const dataQuery = `
                SELECT id, name, ruc
                FROM suppliers
                WHERE active = 1
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute(countQuery),
                turso.execute({ sql: dataQuery, args: [limitNum, offset] })
            ]);

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Suppliers retrieved successfully',
                data: {
                    suppliers: dataResult.rows,
                    pagination: {
                        currentPage: pageNum,
                        totalPages: totalPages,
                        totalItems: totalItems,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error retrieving suppliers', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving suppliers',
                data: null
            };
        }
    },

    async searchSupplier(page = 1, limit = 10, searchTerm = '') {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const searchPattern = `%${searchTerm}%`;

            const query = `
                SELECT 
                    id,
                    name,
                    ruc,
                    phone,
                    email,
                    address,
                    contact_person,
                    payment_terms,
                    active,
                    COUNT(*) OVER() as total_count
                FROM suppliers
                WHERE name LIKE '%' || ? || '%'
                OR ruc LIKE '%' || ? || '%'
                ORDER BY name ASC
                LIMIT ? OFFSET ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [searchPattern, searchPattern, limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No suppliers found matching the search criteria',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const suppliers = result.rows.map(({ total_count, ...supplier }) => supplier);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Suppliers search completed successfully',
                data: {
                    suppliers,
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
            logger.error('Error searching suppliers', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while searching suppliers',
                data: null
            };
        }
    },

    async getAllSuppliers(filters) {
        try {
            const { search, page, limit } = filters;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            let whereClause = "WHERE 1=1";
            const args = [];

            if (search) {
                whereClause += ` AND (
                    name LIKE '%' || ? || '%' OR 
                    ruc LIKE '%' || ? || '%' OR 
                    contact_person LIKE '%' || ? || '%'
                )`;
                args.push(search, search, search);
            }

            const query = `
                SELECT 
                    s.id, s.name, s.ruc, s.phone, s.contact_person, s.email, s.active,
                    -- Subquery para saber cuánto le debo a cada uno en la lista
                    (SELECT COALESCE(SUM(balance), 0) 
                    FROM accounts_payable 
                    WHERE supplier_id = s.id AND status != 'PAGADO') as current_debt,
                    COUNT(*) OVER() as total_count            
                FROM suppliers s
                ${whereClause}
                ORDER BY s.name ASC
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
                    message: 'No suppliers found with the given filters',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const suppliers = result.rows.map(({ total_count, ...supplier }) => supplier);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Suppliers retrieved successfully',
                data: {
                    suppliers,
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
            logger.error('Error retrieving all suppliers with filters', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving suppliers with filters',
                data: null
            };
        }
    },

    async getSupplierById(supplierId) {
        try {
            const supplierSql = `SELECT * FROM suppliers WHERE id = ?`;

            const debtSql = `
                SELECT 
                    COALESCE(SUM(balance), 0) as total_debt,
                    COALESCE(SUM(CASE 
                        WHEN due_date < date('now', '-5 hours') THEN balance 
                        ELSE 0 
                    END), 0) as overdue_debt
                FROM accounts_payable
                WHERE supplier_id = ? AND status != 'PAGADO';
            `;

            const [supplierRes, debtRes] = await Promise.all([
                turso.execute({ sql: supplierSql, args: [supplierId] }),
                turso.execute({ sql: debtSql, args: [supplierId] })
            ]);

            if (supplierRes.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Supplier not found',
                    data: null
                };
            }

            const supplier = supplierRes.rows[0];
            const debtInfo = debtRes.rows[0];

            return {
                success: true,
                code: 200,
                data: {
                    ...supplier,
                    balance_summary: {
                        total_debt: Number(debtInfo.total_debt),
                        overdue_debt: Number(debtInfo.overdue_debt),
                        currency: 'USD'
                    }
                }
            };
        } catch (error) {
            logger.error('Error retrieving supplier by ID', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier by ID',
                data: null
            };
        }
    },

    async updateSupplier(supplierId, updateData) {
        try {
            const fields = [];
            const values = [];

            Object.keys(updateData).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No fields to update',
                    data: null
                };
            }

            values.push(supplierId);

            const query = `
                UPDATE suppliers 
                SET ${fields.join(', ')}, updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            const result = await turso.execute({ sql: query, args: values });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Supplier not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Supplier updated successfully',
                data: { id: supplierId }
            };
        } catch (error) {
            logger.error('Error updating supplier', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while updating supplier',
                data: null
            };
        }
    },

    async getSupplierAccountStatus(supplierId) {
        try {
            const query = `
                SELECT 
                    ap.id,
                    ap.purchase_id,
                    p.invoice_number, -- Número de factura física
                    ap.amount as original_amount,
                    ap.balance,
                    ap.due_date,
                    ap.status,
                    ap.created_at
                FROM accounts_payable ap
                LEFT JOIN purchases p ON ap.purchase_id = p.id
                WHERE ap.supplier_id = ?
                ORDER BY ap.due_date ASC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [supplierId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No account status records found for this supplier',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Supplier account status retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving supplier account status', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier account status',
                data: null
            };
        }
    },

    async getSupplierPurchases(supplierId) {
        try {
            const query = `
                SELECT 
                    p.id,
                    p.invoice_number,
                    p.total,
                    p.status,
                    p.payment_method,
                    p.created_at,
                    u.name as buyer_name
                FROM purchases p
                JOIN users u ON p.user_id = u.id
                WHERE p.supplier_id = ?
                ORDER BY p.created_at DESC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [supplierId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No purchases found for this supplier',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Supplier purchases retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving supplier purchases', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier purchases',
                data: null
            };

        }
    },

    async getSupplierProducts(supplierId) {
        try {
            const query = `
                SELECT 
                    p.id,
                    p.invoice_number,
                    p.total,
                    p.status,
                    p.payment_method,
                    p.created_at,
                    u.name as buyer_name -- Quién registró la compra
                FROM purchases p
                JOIN users u ON p.user_id = u.id
                WHERE p.supplier_id = ?
                ORDER BY p.created_at DESC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [supplierId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found for this supplier',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Supplier products retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving supplier products', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier products',
                data: null
            };
        }
    },

    async getSupplierProducts(supplierId) {
        try {
            const query = `
                SELECT DISTINCT 
                    prod.id, 
                    prod.code, 
                    prod.name, 
                    prod.purchase_price, -- El precio referencial actual
                    prod.stock
                FROM purchase_details pd
                JOIN purchases p ON pd.purchase_id = p.id
                JOIN products prod ON pd.product_id = prod.id
                WHERE p.supplier_id = ?
                ORDER BY prod.name ASC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [supplierId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found for this supplier',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Supplier products retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving supplier products', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier products',
                data: null
            };
        }
    }
};