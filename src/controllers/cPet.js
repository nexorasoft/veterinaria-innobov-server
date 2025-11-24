import { sPet } from "../services/sPet.js";
import { logger } from "../utils/logger.js";

export const cPet = {
    async getAllPets(req, res) {
        try {
            const filterParams = req.query;
            const serviceResponse = await sPet.getAllPets(filterParams);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cPet.getAllPets - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getPetProfile(req, res) {
        try {
            const petId = req.params.petId;
            const serviceResponse = await sPet.getPetProfile(petId);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cPet.getPetProfile - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async updatePet(req, res) {
        try {
            const { petId } = req.params;
            const petData = req.body;
            console.log('Received pet update request for petId:', petId, 'with data:', petData);
            const imageBuffer = req.file ? req.file.buffer : null;

            const result = await sPet.updatePet(petId, petData, imageBuffer);

            return res.status(result.code).json(result);

        } catch (error) {
            logger.error(`cPet.updatePet - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async addWeightRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user ? req.user.id : req.body.user_id;
            const result = await sPet.addWeightRecord(id, req.body, userId);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    async getWeightHistory(req, res) {
        try {
            const { id } = req.params;
            const result = await sPet.getWeightHistory(id);
            return res.status(result.code).json(result);
        } catch (error) {
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
    },

    async deleteWeightRecord(req, res) {
        try {
            const { id, weightId } = req.params;
            const result = await sPet.deleteWeightRecord(id, weightId);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
