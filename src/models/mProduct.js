import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mProduct = {
    async createProduct(productData) {
        try {
            const query = `
                INSERT INTO products(
                    id, category_id, supplier_id, code, 
                    name, description, purchase_price, 
                    sale_price, wholesale_price, stock, min_stock, 
                    max_stock, unit, is_medicine, requires_prescription, 
                    active_ingredient, concentration, expiration_date,
                    batch_number, active, taxable
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    productData.id,
                    productData.category_id,
                    productData.supplier_id || null,
                    productData.code || null,
                    productData.name,
                    productData.description || null,
                    productData.purchase_price,
                    productData.sale_price,
                    productData.wholesale_price || null,
                    productData.stock,
                    productData.min_stock,
                    productData.max_stock || null,
                    productData.unit,
                    productData.is_medicine,
                    productData.requires_prescription,
                    productData.active_ingredient || null,
                    productData.concentration || null,
                    productData.expiration_date || null,
                    productData.batch_number || null,
                    productData.active,
                    productData.taxable
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Product creation failed: No rows affected', { name: productData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create product',
                    data: null
                };
            }

            logger.info('Product created successfully', {
                productId: productData.id,
                name: productData.name
            });

            return {
                success: true,
                code: 201,
                message: 'Product created successfully',
                data: {
                    id: productData.id,
                    name: productData.name
                }
            };
        } catch (error) {
            logger.error('Error creating product', { error, name: productData.name });
            return {
                success: false,
                code: 500,
                message: 'An error occurred while creating the product',
                data: null
            };
        }
    },

    async getProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM products;
            `;

            const dataQuery = `
                SELECT 
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute(countQuery),
                turso.execute({ sql: dataQuery, args: [limitNum, offset] })
            ]);

            if (dataResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found',
                    data: null
                };
            }

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Products retrieved successfully',
                data: {
                    products: dataResult.rows,
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
            logger.error('Error retrieving products', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving products',
                data: null
            };
        }
    },

    async searchProducts(searchTerm, page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const query = `
                SELECT
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active,
                    COUNT(*) OVER() as total_count
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE (
                    p.name LIKE ? OR
                    p.code LIKE ?
                )
                ORDER BY p.name ASC
                LIMIT ? OFFSET ?; 
            `;

            const searchPattern = `%${searchTerm}%`;

            const result = await turso.execute({
                sql: query,
                args: [searchPattern, searchPattern, limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found matching the search criteria',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const products = result.rows.map(({ total_count, ...product }) => product);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Products retrieved successfully',
                data: {
                    products,
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
            logger.error('Error searching products', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while searching for products',
                data: null
            };
        }
    },

    async getProductsByCategory(categoryId, page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM products
                WHERE category_id = ?;
            `;

            const dataQuery = `
                SELECT 
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.category_id = ?
                ORDER BY p.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute({ sql: countQuery, args: [categoryId] }),
                turso.execute({ sql: dataQuery, args: [categoryId, limitNum, offset] })
            ]);

            if (dataResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found for the specified category',
                    data: null
                };
            }

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Products retrieved successfully',
                data: {
                    products: dataResult.rows,
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
            logger.error('Error retrieving products by category', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving products by category',
                data: null
            };
        }
    },

    async getProductsByStatus(isActive, page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM products
                WHERE active = ?;
            `;

            const dataQuery = `
                SELECT 
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = ?
                ORDER BY p.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute({ sql: countQuery, args: [isActive] }),
                turso.execute({ sql: dataQuery, args: [isActive, limitNum, offset] })
            ]);

            if (dataResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No products found for the specified status',
                    data: null
                };
            }

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Products retrieved successfully',
                data: {
                    products: dataResult.rows,
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
            logger.error('Error retrieving products by status', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving products by status',
                data: null
            };
        }
    },

    async getLowStockProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const query = `
                SELECT
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active,
                    COUNT(*) OVER() as total_count
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.stock <= p.min_stock
                ORDER BY p.stock ASC
                LIMIT ? OFFSET ?; 
            `;

            const result = await turso.execute({
                sql: query,
                args: [limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No low stock products found',
                    data: null
                };
            }
            const total = result.rows[0]?.total_count || 0;
            const products = result.rows.map(({ total_count, ...product }) => product);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Low stock products retrieved successfully',
                data: {
                    products,
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
            logger.error('Error retrieving low stock products', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving low stock products',
                data: null
            };
        }
    },

    async getProductDetailsById(productId) {
        try {
            const query = `
            SELECT
                p.id,
                p.code,
                p.name,
                p.description,
                p.purchase_price,
                p.sale_price,
                p.wholesale_price,
                p.stock,
                p.min_stock,
                p.max_stock,
                p.unit,
                p.is_medicine,
                p.requires_prescription,
                p.active_ingredient,
                p.concentration,
                p.expiration_date,
                p.batch_number,
                p.active,
                p.taxable,
                p.created_at,
                p.updated_at,

                -- Categoría
                c.id AS category_id,
                c.name AS category_name,
                c.description AS category_description,
                c.parent_category_id,

                -- Proveedor
                s.id AS supplier_id,
                s.name AS supplier_name,
                s.ruc AS supplier_ruc,
                s.phone AS supplier_phone,
                s.email AS supplier_email,
                s.address AS supplier_address,
                s.contact_person AS supplier_contact_person,
                s.payment_terms AS supplier_payment_terms
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?;
        `;

            const result = await turso.execute({
                sql: query,
                args: [productId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Product not found',
                    data: null
                };
            }

            const row = result.rows[0];

            const formattedData = {
                id: row.id,
                code: row.code,
                name: row.name,
                description: row.description,
                prices: {
                    purchase: row.purchase_price,
                    sale: row.sale_price,
                    wholesale: row.wholesale_price
                },
                stock: {
                    current: row.stock,
                    min: row.min_stock,
                    max: row.max_stock
                },
                unit: row.unit,
                medicine_info: {
                    is_medicine: row.is_medicine,
                    requires_prescription: row.requires_prescription,
                    active_ingredient: row.active_ingredient,
                    concentration: row.concentration,
                    expiration_date: row.expiration_date,
                    batch_number: row.batch_number
                },
                status: {
                    active: row.active,
                    taxable: row.taxable
                },
                category: {
                    id: row.category_id,
                    name: row.category_name,
                    description: row.category_description,
                    parent_category_id: row.parent_category_id
                },
                supplier: row.supplier_id ? {
                    id: row.supplier_id,
                    name: row.supplier_name,
                    ruc: row.supplier_ruc,
                    phone: row.supplier_phone,
                    email: row.supplier_email,
                    address: row.supplier_address,
                    contact_person: row.supplier_contact_person,
                    payment_terms: row.supplier_payment_terms
                } : null,
                timestamps: {
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }
            };

            return {
                success: true,
                code: 200,
                message: 'Product details retrieved successfully',
                data: formattedData
            };

        } catch (error) {
            logger.error('Error retrieving product details by ID', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving product details',
                data: null
            };
        }
    },

    async updateProduct(productId, updatedFields) {
        try {
            const keys = Object.keys(updatedFields);
            if (keys.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No fields provided to update',
                    data: null
                };
            }

            const setClause = keys.map(key => `${key} = ?`).join(', ');
            const values = keys.map(key => updatedFields[key]);
            values.push(productId);

            const query = `
                UPDATE products
                SET ${setClause},
                    updated_at = (datetime('now', '-5 hours'))
                WHERE id = ?;
            `;


            const result = await turso.execute({
                sql: query,
                args: values
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Product not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Product updated successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error updating product', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while updating the product',
                data: null
            };
        }
    },

    async softDeleteProduct(productId) {
        try {
            const query = `
                UPDATE products
                SET active = 0,
                    updated_at = (datetime('now', '-5 hours'))
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [productId]
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Product not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Product soft-deleted successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error soft-deleting product', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while soft-deleting the product',
                data: null
            };
        }
    },

    async activateProduct(productId) {
        try {
            const query = `
                UPDATE products
                SET active = 1,
                    updated_at = (datetime('now', '-5 hours'))
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [productId]
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Product not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Product activated successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error activating product', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while activating the product',
                data: null
            };
        }
    },

    async getMedicineProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM products
                WHERE is_medicine = 1;
            `;

            const dataQuery = `
                SELECT 
                    p.id as product_id,
                    p.code AS product_code,
                    p.name AS product_name,
                    c.name AS category_name,
                    p.stock AS stock_quantity,
                    p.min_stock AS min_stock_quantity,
                    p.unit AS unit_measure,
                    p.sale_price AS sale_price,
                    p.purchase_price AS purchase_price,
                    p.active AS is_active
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_medicine = 1
                ORDER BY p.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute({ sql: countQuery }),
                turso.execute({ sql: dataQuery, args: [limitNum, offset] })
            ]);

            if (dataResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No medicine products found',
                    data: null
                };
            }
            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);
            return {
                success: true,
                code: 200,
                message: 'Medicine products retrieved successfully',
                data: {
                    products: dataResult.rows,
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
            logger.error('Error retrieving medicine products', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving medicine products',
                data: null
            };
        }
    },

    async getExpiringProducts(days = 30) {
        try {
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.code,
                    p.stock,
                    p.min_stock,
                    p.expiration_date,
                    p.batch_number,
                    p.is_medicine,
                    CAST(
                        julianday(p.expiration_date) - julianday(date('now', '-5 hours'))
                    AS INTEGER
                    ) AS days_to_expire
                FROM products p
                WHERE
                    p.active = 1
                    AND p.expiration_date IS NOT NULL
                    AND date(p.expiration_date)
                        <= date('now', '+${days} days', '-5 hours')
                ORDER BY
                    date(p.expiration_date) ASC;
            `;

            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No expiring products found within the specified timeframe.',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Productos próximos a caducar obtenidos correctamente.',
                data: result.rows
            };

        } catch (error) {
            logger.error('mProduct.getExpiringProducts:', error);
            return {
                success: false,
                code: 500,
                message: 'Error al obtener productos próximos a caducar.',
                data: null
            };
        }
    }
};