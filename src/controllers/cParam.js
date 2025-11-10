import { sParam } from "../services/sParam.js";
import { logger } from "../utils/logger.js";

export const cParam = {
    async createSpecie(req, res) {
        try {
            const specieData = req.body;

            logger.debug('Create Specie request received', {
                name: specieData?.name
            });

            const result = await sParam.createSpecie(specieData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createSpecie controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};