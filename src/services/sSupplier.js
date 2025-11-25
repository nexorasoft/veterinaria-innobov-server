import { mSupplier } from "../models/mSupplier.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sSupplier = {
    async createSupplier(supplierData) {
        try {
            const requiredFields = ['name', 'ruc', 'phone'];

            const missingFields = requiredFields.filter(field =>
                !supplierData[field] || (typeof supplierData[field] === 'string' && supplierData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    code: 400,
                    data: null
                };
            }

            const newSupplier = {
                id: uuidv4(),
                name: supplierData.name.trim(),
                ruc: supplierData.ruc.trim(),
                phone: supplierData.phone.trim(),
                email: supplierData.email ? supplierData.email.trim() : null,
                address: supplierData.address ? supplierData.address.trim() : null,
                contact_person: supplierData.contact_person ? supplierData.contact_person.trim() : null,
                payment_terms: supplierData.payment ? supplierData.payment_terms.trim() : null,
            };

            const result = await mSupplier.createSupplier(newSupplier);

            return result;
        } catch (error) {
            logger.error('Error in createSupplier service', error);
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
            const result = await mSupplier.getSuppliers(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getSuppliers service', error);
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
            const result = await mSupplier.searchSupplier(pageNum, limitNum, searchTerm);
            return result;
        } catch (error) {
            logger.error('Error in searchSupplier service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while searching suppliers',
                data: null
            };
        }
    },

    async getAllSuppliers(queryParams) {
        try {
            const page = parseInt(queryParams.page) || 1;
            const limit = parseInt(queryParams.limit) || 10;
            const search = queryParams.search || '';
            const result = await mSupplier.getAllSuppliers({ page, limit, search });
            return result;
        } catch (error) {
            logger.error('Error in getAllSuppliers service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving all suppliers',
                data: null
            };
        }
    },

    async getSupplierProfile(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Supplier ID is required',
                    data: null
                };
            }

            return await mSupplier.getSupplierById(id);
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving supplier profile',
                data: null
            };
        }
    },

    async updateSupplier(id, data) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Supplier ID is required',
                    data: null
                };
            }

            const cleanData = {};
            if (data.name) cleanData.name = data.name.trim();
            if (data.ruc) cleanData.ruc = data.ruc.trim();
            if (data.phone) cleanData.phone = data.phone.trim();
            if (data.contact_person) cleanData.contact_person = data.contact_person.trim();
            if (data.email) cleanData.email = data.email.trim().toLowerCase();
            if (data.address) cleanData.address = data.address.trim();
            if (data.payment_terms) cleanData.payment_terms = data.payment_terms;
            if (data.active !== undefined) cleanData.active = data.active;

            if (Object.keys(cleanData).length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No valid data provided',
                    data: null
                };
            }

            return await mSupplier.updateSupplier(id, cleanData);
        } catch (error) {
            logger.error('Service update error', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getAccountStatus(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Supplier ID is required',
                    data: null
                };
            }

            return await mSupplier.getSupplierAccountStatus(id);
        } catch (error) {
            logger.error('Service getAccountStatus error', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getPurchasesHistory(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Supplier ID is required',
                    data: null
                };
            }
            return await mSupplier.getSupplierPurchases(id);
        } catch (error) {
            logger.error('Service getPurchasesHistory error', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getCatalog(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Supplier ID is required',
                    data: null
                };
            }
            return await mSupplier.getSupplierProducts(id);
        } catch (error) {
            logger.error('Service getCatalog error', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
};