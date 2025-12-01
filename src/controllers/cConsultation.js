import { sConsultation } from "../services/sConsultation.js";
import { logger } from "../utils/logger.js";

export const cConsultation = {
    async getAll(req, res) {
        try {
            const result = await sConsultation.getAll(req.query);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.getAll:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async create(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;
            const result = await sConsultation.startConsultation(userId, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.create:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async getDetail(req, res) {
        try {
            const result = await sConsultation.getDetail(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.getDetail:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async update(req, res) {
        try {
            const result = await sConsultation.updateConsultation(req.params.id, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.update:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async delete(req, res) {
        try {
            const result = await sConsultation.cancelConsultation(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.delete:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async addMedications(req, res) {
        try {
            const result = await sConsultation.addMediciones(req.params.id, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.addMedications:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    },

    async removeMedications(req, res) {
        try {
            const result = await sConsultation.removeMediciones(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("Controller error cConsultation.removeMedications:", error);
            return res.status(500).json({ success: false, code: 500, message: "Internal server error", data: null });
        }
    }
};