import { mProduct } from "../models/mProduct.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sProduct = {
    async createProduct(productData) {
        try {
            const requiredFields = ['category_id', 'name', 'purchase_price', 'sale_price', 'stock', 'min_stock', 'unit', 'is_medicine', 'requires_prescription', 'active', 'taxable'];

            const missingFields = requiredFields.filter(field =>
                productData[field] === undefined || productData[field] === null || (typeof productData[field] === 'string' && productData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const newProduct = {
                id: uuidv4(),
                category_id: productData.category_id,
                supplier_id: productData.supplier_id || null,
                code: productData.code || null,
                name: productData.name.trim(),
                description: productData.description || null,
                purchase_price: productData.purchase_price,
                sale_price: productData.sale_price,
                wholesale_price: productData.wholesale_price || null,
                stock: productData.stock,
                min_stock: productData.min_stock,
                max_stock: productData.max_stock || null,
                unit: productData.unit,
                is_medicine: productData.is_medicine,
                requires_prescription: productData.requires_prescription,
                active_ingredient: productData.active_ingredient || null,
                concentration: productData.concentration || null,
                expiration_date: productData.expiration_date || null,
                batch_number: productData.batch_number || null,
                active: productData.active,
                taxable: productData.taxable
            };

            const result = await mProduct.createProduct(newProduct);

            return result;
        } catch (error) {
            logger.error('Error in createProduct service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating product',
                data: null
            };
        }
    },

    async getProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.getProducts(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getProducts service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving products',
                data: null
            };
        }
    },

    async searchProducts(searchTerm, page = 1, limit = 10) {
        try {
            if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid search term',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.searchProducts(searchTerm, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in searchProducts service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while searching products',
                data: null
            };
        }
    },

    async getProductsByCategory(categoryId, page = 1, limit = 10) {
        try {
            if (!categoryId || typeof categoryId !== 'string' || categoryId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid category ID',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.getProductsByCategory(categoryId, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getProductsByCategory service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving products by category',
                data: null
            };
        }
    },

    async getProductsByStatus(isActive, page = 1, limit = 10) {
        try {
            const isActiveValue = (isActive === 'true' || isActive === true) ? 1 : (isActive === 'false' || isActive === false) ? 0 : null;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.getProductsByStatus(isActiveValue, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getProductsByStatus service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving products by status',
                data: null
            };
        }
    },

    async getLowStockProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.getLowStockProducts(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getLowStockProducts service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving low stock products',
                data: null
            };
        }
    },

    async getProductDetailsById(productId) {
        try {
            if (!productId || typeof productId !== 'string' || productId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid product ID',
                    data: null
                };
            }
            const result = await mProduct.getProductDetailsById(productId);
            return result;
        } catch (error) {
            logger.error('Error in getProductDetailsById service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving product details',
                data: null
            };
        }
    },

    async updateProduct(productId, productData) {
        try {
            if (!productId || typeof productId !== 'string' || productId.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Product ID is required and must be a valid non-empty string',
                    data: null
                };
            }

            const validFields = [
                'category_id', 'supplier_id', 'code', 'name', 'description',
                'purchase_price', 'sale_price', 'wholesale_price',
                'stock', 'min_stock', 'max_stock', 'unit',
                'is_medicine', 'requires_prescription', 'active_ingredient',
                'concentration', 'expiration_date', 'batch_number',
                'active', 'taxable'
            ];

            const updatedFields = {};
            for (const key of validFields) {
                if (productData[key] !== undefined) {
                    updatedFields[key] = productData[key];
                }
            }

            if (Object.keys(updatedFields).length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No valid fields provided for update',
                    data: null
                };
            }

            const result = await mProduct.updateProduct(productId, updatedFields);
            return result;
        } catch (error) {
            logger.error('Error in updateProduct service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while updating product',
                data: null
            };
        }
    },

    async softDeleteProduct(productId) {
        try {
            if (!productId || typeof productId !== "string" || productId.trim() === "") {
                return {
                    success: false,
                    code: 400,
                    message: "El ID del producto es obligatorio y debe ser una cadena válida",
                    data: null,
                };
            }
            const result = await mProduct.softDeleteProduct(productId);
            return result;
        } catch (error) {
            logger.error('Error in softDeleteProduct service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while soft deleting product',
                data: null
            };
        }
    },

    async activateProduct(productId) {
        try {
            if (!productId || typeof productId !== "string" || productId.trim() === "") {
                return {
                    success: false,
                    code: 400,
                    message: "El ID del producto es obligatorio y debe ser una cadena válida",
                    data: null,
                };
            }
            const result = await mProduct.activateProduct(productId);
            return result;
        } catch (error) {
            logger.error('Error in activateProduct service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while activating product',
                data: null
            };
        }
    },

    async getMedicineProducts(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mProduct.getMedicineProducts(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getMedicineProducts service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving medicine products',
                data: null
            };
        }
    },

    async getExpiringProducts(days) {
        try {
            if (!days || isNaN(days) || days <= 0) {
                return {
                    success: false,
                    code: 400,
                    message: "El parámetro days debe ser un número positivo.",
                    data: null
                };
            }

            const result = await mProduct.getExpiringProducts(days);
            return result;
        } catch (error) {
            logger.error('Error in getExpiringProducts service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving expiring products',
                data: null
            };
        }
    }
};