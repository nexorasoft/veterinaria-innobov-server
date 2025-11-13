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
    }
};