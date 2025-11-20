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
    }
};