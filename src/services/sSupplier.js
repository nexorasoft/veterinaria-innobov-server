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
    }
};