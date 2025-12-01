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
    },

    async getMedicineSymptoms(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sSymptom.getMedicineSymptoms(page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getMedicineSymptoms controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async updateAssociatedSymptomEffectiveness(req, res) {
        try {
            const { medicineId, symptomId } = req.params;
            const updateData = req.body;

            logger.debug('Update Associated Symptom Effectiveness request received', {
                medicineId,
                symptomId,
                updateData
            });

            const result = await sSymptom.updateAssociatedSymptomEffectiveness(medicineId, symptomId, updateData);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in updateAssociatedSymptomEffectiveness controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async deleteAssociatedSymptom(req, res) {
        try {
            const { medicineId, symptomId } = req.params;

            logger.debug('Delete Associated Symptom request received', {
                medicineId,
                symptomId
            });

            const result = await sSymptom.deleteAssociatedSymptom(medicineId, symptomId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in deleteAssociatedSymptom controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getDetailAssociatedSymptoms(req, res) {
        try {
            const { medicineId, symptomId } = req.params;

            logger.debug('Get Detail Associated Symptoms request received', {
                medicineId,
                symptomId
            });

            const result = await sSymptom.getDetailAssociatedSymptoms(medicineId, symptomId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getDetailAssociatedSymptoms controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchAssociatedSymptoms(req, res) {
        try {
            const searchTerm = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await sSymptom.searchAssociatedSymptoms(searchTerm, page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchAssociatedSymptoms controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};