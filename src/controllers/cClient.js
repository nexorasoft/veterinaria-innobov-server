import { sClient } from "../services/sClient.js";
import { logger } from "../utils/logger.js";

export const cClient = {
    async getClients(req, res) {
        try {
            const filterParams = req.query;
            const serviceResponse = await sClient.getClients(filterParams);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.getClients - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchClients(req, res) {
        try {
            const searchTerm = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const serviceResponse = await sClient.searchClients(searchTerm, page, limit);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.searchClients - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getClientFullProfile(req, res) {
        try {
            const clientId = req.params.clientId;
            const serviceResponse = await sClient.getClientFullProfile(clientId);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.getClientFullProfile - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async createClient(req, res) {
        try {
            const clientData = req.body;
            const serviceResponse = await sClient.createClient(clientData);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.createClient - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async updateClient(req, res) {
        try {
            const clientId = req.params.clientId;
            const clientData = req.body;
            const serviceResponse = await sClient.updateClient(clientId, clientData);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.updateClient - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getClientAccountStatus(req, res) {
        try {
            const clientId = req.params.clientId;
            const serviceResponse = await sClient.getClientAccountStatus(clientId);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.getClientAccountStatus - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async addPetToClient(req, res) {
        try {
            const clientId = req.params.clientId;
            const petData = { ...req.body };

            if (req.file) {
                petData.imageBuffer = req.file.buffer;
            }

            const serviceResponse = await sClient.addPetToClient(clientId, petData);
            return res.status(serviceResponse.code).json(serviceResponse);
        } catch (error) {
            logger.error(`cClient.addPetToClient - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async registerFullClient(req, res) {
        try {
            let requestData;

            // Manejo especial para Multipart/Form-Data
            if (req.file || req.headers['content-type']?.includes('multipart/form-data')) {
                // El frontend debe enviar el JSON en un campo llamado "data"
                // Ejemplo en Postman: Key: "data", Value: '{"client": {...}, "pet": {...}}'
                if (req.body.data) {
                    requestData = JSON.parse(req.body.data);
                } else {
                    // Fallback por si envían los campos planos (menos recomendado para anidados)
                    requestData = req.body;
                }
            } else {
                // JSON normal sin imagen
                requestData = req.body;
            }

            // Extraer buffer si existe
            const imageBuffer = req.file ? req.file.buffer : null;
            requestData.imageBuffer = imageBuffer;
            const serviceResponse = await sClient.registerFullClient(requestData);
            return res.status(serviceResponse.code).json(serviceResponse);

        } catch (error) {
            logger.error(`cClient.registerFullClient - Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};