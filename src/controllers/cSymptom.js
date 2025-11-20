import { sSymptom } from "../services/sSymptom.js";
import { logger } from "../utils/logger.js";

export const cSymptom = {
    async createSymptom(req, res) {
        try {
            const symptomData = req.body;

            logger.debug('Create Symptom request received', {
                name: symptomData?.name,
                severity: symptomData?.severity
            });

            const result = await sSymptom.createSymptom(symptomData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createSymptom controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async associateSymptomWithMedicine(req, res) {
        try {
            const associateData = req.body;

            logger.debug('Associate Symptom with Medicine request received', {
                medicineId: associateData?.medicineId,
                symptomsCount: Array.isArray(associateData?.symptoms) ? associateData.symptoms.length : 0
            });

            const result = await sSymptom.associateSymptomWithMedicine(associateData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in associateSymptomWithMedicine controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchMedicinesBySymptoms(req, res) {
        try {
            const symptomNames = req.body;

            logger.debug('Search Medicines by Symptoms request received', {
                symptomNames
            });

            const result = await sSymptom.searchMedicinesBySymptoms(symptomNames || []);
            console.log(result);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchMedicinesBySymptoms controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchSymptomsByName(req, res) {
        try {
            const searchTerm = req.query.q || '';
            logger.debug('Search Symptoms by Name request received', {
                searchTerm
            });

            const result = await sSymptom.searchSymptomsByName(searchTerm || '');

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchSymptomsByName controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};