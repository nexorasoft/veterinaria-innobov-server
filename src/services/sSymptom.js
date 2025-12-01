import { mSymptom } from "../models/mSymptom.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sSymptom = {
    async createSymptom(symptomData) {
        try {
            const requiredFields = ['name', 'severity'];

            const missingFields = requiredFields.filter(field =>
                symptomData[field] === undefined || symptomData[field] === null || (typeof symptomData[field] === 'string' && symptomData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const newSymptom = {
                id: uuidv4(),
                name: symptomData.name.trim(),
                description: symptomData.description ? symptomData.description.trim() : null,
                severity: symptomData.severity.trim().toUpperCase()
            };

            const result = await mSymptom.createSymptom(newSymptom);
            return result;
        } catch (error) {
            logger.error('Error in createSymptom service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async associateSymptomWithMedicine(associateData) {
        try {
            if (!associateData.medicine_id || !Array.isArray(associateData.symptoms) || associateData.symptoms.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'medicine_id and symptoms array are required',
                    data: null
                };
            }

            const result = await mSymptom.associateSymptomWithMedicine(associateData);

            return result;
        } catch (error) {
            logger.error('Error in associateSymptomWithMedicine service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async searchMedicinesBySymptoms(searchData) {
        try {
            const { symptoms } = searchData;

            if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
                return {
                    success: false,
                    code: 400,
                    message: 'At least one symptom must be provided for intelligent search',
                    data: null
                };
            }

            const symptomList = Array.isArray(symptoms)
                ? symptoms.map(s => s.trim())
                : symptoms.split(',').map(s => s.trim());

            const result = await mSymptom.searchMedicinesBySymptoms(symptomList);
            return result;
        } catch (error) {
            logger.error('Error in searchMedicinesBySymptoms service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async searchSymptomsByName(name) {
        try {
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Symptom name must be a non-empty string',
                    data: null
                };
            }

            const result = await mSymptom.searchSymptomsByName(name.trim());
            return result;
        } catch (error) {
            logger.error('Error in searchSymptomsByName service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getMedicineSymptoms(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const result = await mSymptom.getMedicineSymptoms(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getMedicineSymptoms service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async updateAssociatedSymptomEffectiveness(medicineId, symptomId, updateData) {
        try {
            if (!medicineId || !symptomId) {
                return {
                    success: false,
                    code: 400,
                    message: 'medicineId and symptomId are required',
                    data: null
                };
            }

            const result = await mSymptom.updateAssociatedSymptomEffectiveness(medicineId, symptomId, updateData);
            return result;
        } catch (error) {
            logger.error('Error in updateAssociatedSymptomEffectiveness service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async deleteAssociatedSymptom(medicineId, symptomId) {
        try {
            if (!medicineId || !symptomId) {
                return {
                    success: false,
                    code: 400,
                    message: 'medicineId and symptomId are required',
                    data: null
                };
            }

            const result = await mSymptom.deleteAssociatedSymptom(medicineId, symptomId);
            return result;
        } catch (error) {
            logger.error('Error in deleteAssociatedSymptom service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getDetailAssociatedSymptoms(medicineId, symptomId) {
        try {
            if (!medicineId || !symptomId) {
                return {
                    success: false,
                    code: 400,
                    message: 'medicineId and symptomId are required',
                    data: null
                };
            }

            const result = await mSymptom.getDetailAssociatedSymptoms(medicineId, symptomId);
            return result;
        } catch (error) {
            logger.error('Error in getDetailAssociatedSymptoms service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async searchAssociatedSymptoms(search, page = 1, limit = 10) {
        try {
            if (!search || typeof search !== 'string' || search.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid search term',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mSymptom.searchAssociatedSymptoms(search.trim(), pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in searchAssociatedSymptoms service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
};