import { sProduct } from "../services/sProduct.js";
import { logger } from "../utils/logger.js";

export const cProduct = {
    async createProduct(req, res) {
        try {
            const productData = req.body;

            logger.debug('Create Product request received', {
                name: productData?.name,
                code: productData?.code
            });

            const result = await sProduct.createProduct(productData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createProduct controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sProduct.getProducts(page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProducts controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchProducts(req, res) {
        try {
            const searchTerm = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await sProduct.searchProducts(searchTerm, page, limit);
            console.log(result);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchProducts controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProductsByCategory(req, res) {
        try {
            const categoryId = req.params.categoryId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sProduct.getProductsByCategory(categoryId, page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProductsByCategory controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProductsByStatus(req, res) {
        try {
            const isActive = req.query.active;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sProduct.getProductsByStatus(isActive, page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProductsByStatus controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getLowStockProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await sProduct.getLowStockProducts(page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getLowStockProducts controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProductDetailsById(req, res) {
        try {
            const productId = req.params.productId;

            const result = await sProduct.getProductDetailsById(productId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProductDetailsById controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async updateProduct(req, res) {
        try {
            const productId = req.params.productId;
            const updateData = req.body;

            const result = await sProduct.updateProduct(productId, updateData);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in updateProduct controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async softDeleteProduct(req, res) {
        try {
            const productId = req.params.productId;

            const result = await sProduct.softDeleteProduct(productId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in softDeleteProduct controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async activateProduct(req, res) {
        try {
            const productId = req.params.productId;

            const result = await sProduct.activateProduct(productId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in activateProduct controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};