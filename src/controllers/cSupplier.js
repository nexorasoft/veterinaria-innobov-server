import { sSupplier } from "../services/sSupplier.js";
import { logger } from "../utils/logger.js";

export const cSupplier = {
    async createSupplier(req, res) {
        try {
            const supplierData = req.body;

            logger.debug('Create Supplier request received', {
                name: supplierData?.name,
                ruc: supplierData?.ruc,
                phone: supplierData?.phone
            });

            const result = await sSupplier.createSupplier(supplierData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createSupplier controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getSuppliers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sSupplier.getSuppliers(page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getSuppliers controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchSupplier(req, res) {
        try {
            const searchTerm = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await sSupplier.searchSupplier(page, limit, searchTerm);
            console.log(result);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchSupplier controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getAllSuppliers(req, res) {
        try {
            const result = await sSupplier.getAllSuppliers(req.query);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getAllSuppliers controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProfile(req, res) {
        try {
            const result = await sSupplier.getSupplierProfile(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProfile controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async update(req, res) {
        try {
            const result = await sSupplier.updateSupplier(req.params.id, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in update controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getAccountStatus(req, res) {
        try {
            const result = await sSupplier.getAccountStatus(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getAccountStatus controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getPurchases(req, res) {
        try {
            const result = await sSupplier.getPurchasesHistory(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getPurchases controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getProductsCatalog(req, res) {
        try {
            const result = await sSupplier.getCatalog(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getProductsCatalog controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};