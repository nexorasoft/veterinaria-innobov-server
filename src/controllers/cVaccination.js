import { sVaccination } from "../services/sVaccination.js";
import { logger } from "../utils/logger.js";

export const cVaccination = {
    async getByPet(req, res) {
        try {
            const { petId } = req.params;
            const result = await sVaccination.getByPet(petId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("cVaccination.getByPet:", error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: "Error al procesar la solicitud.",
                data: null
            });
        }
    },

    async create(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;
            const result = await sVaccination.create(userId, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("cVaccination.create:", error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: "Error al procesar la solicitud.",
                data: null
            });
        }
    },

    async getUpcoming(req, res) {
        try {
            const days = req.query.days ? parseInt(req.query.days, 10) : 30;
            const result = await sVaccination.getUpcomingList(days);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("cVaccination.getUpcoming:", error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: "Error al procesar la solicitud.",
                data: null
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await sVaccination.delete(id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error("cVaccination.delete:", error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: "Error al procesar la solicitud.",
                data: null
            });
        }
    }
};