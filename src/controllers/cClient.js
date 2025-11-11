import { sClient } from "../services/sClient.js";
import { logger } from "../utils/logger.js";

export const cClient = {
    async getOrCreateClient(req, res) {
        try {
            const clientData = req.body;

            logger.debug('Get or Create Client request received', {
                dni: clientData?.dni,
                name: clientData?.name,
                phone: clientData?.phone
            });

            const result = await sClient.getOrCreateClient(clientData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getOrCreateClient controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};