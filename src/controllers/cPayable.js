import { sPayable } from "../services/sPayable.js";
import { logger } from "../utils/logger.js";

export const cPayable = {

    async getAllPayables(req, res) {
        try {
            const queryParams = req.query;
            const result = await sPayable.getAll(queryParams);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Controller error payables', error);
            return res.status(500).json({ success: false, code: 500, message: 'Error interno', data: null });
        }
    },

    async getPayableDetail(req, res) {
        try {
            const { id } = req.params;
            const result = await sPayable.getDetail(id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Controller error payable detail', error);
            return res.status(500).json({ success: false, code: 500, message: 'Error interno', data: null });
        }
    },

    async registerPayment(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;
            const userId = req.user ? req.user.id : req.body.user_id;
            const result = await sPayable.registerPayment(id, body, userId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Controller error register payable payment', error);
            return res.status(500).json({ success: false, code: 500, message: 'Error interno', data: null });
        }
    },

    async getHistory(req, res) {
        try {
            const { id } = req.params;
            const result = await sPayable.getHistory(id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Controller error payable payment history', error);
            return res.status(500).json({ success: false, code: 500, message: 'Error interno', data: null });
        }
    }
};          