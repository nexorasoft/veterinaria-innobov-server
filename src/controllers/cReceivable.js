import { sReceivable } from "../services/sReceivable.js";

export const cReceivable = {
    async getReceivables(req, res) {
        try {
            const queryParams = req.query;
            const result = await sReceivable.getReceivables(queryParams);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error while retrieving receivables',
                data: null
            });
        }
    },

    async registerPayment(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;
            const userId = req.user ? req.user.id : req.body.user_id;
            const result = await sReceivable.registerPayment(id, body, userId);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error while registering payment',
                data: null
            });
        }
    },

    async getHistory(req, res) {
        try {
            const { id } = req.params;
            const result = await sReceivable.getHistory(id);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error while retrieving payment history',
                data: null
            });
        }
    },

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const result = await sReceivable.getDetail(id);
            return res.status(result.code).json(result);
        } catch (error) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error while retrieving receivable detail',
                data: null
            });
        }
    }
};  