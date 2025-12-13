import { sSystem } from "../services/sSystem.js";
import { hSystem } from "../helpers/hSystem.js";
import { logger } from "../utils/logger.js";

export const cSystem = {
    async createSetup(req, res) {
        try {
            const settingsData = req.body;

            const result = await sSystem.createSetup(settingsData);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createSetup controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor.',
                data: null
            });
        }
    }
};