import { sPurchase } from "../services/sPurchase.js";
import { logger } from "../utils/logger.js";

export const cPurchase = {
    async createPurchase(req, res) {
        try {
            const userId = req.user.id;
            const purchaseData = req.body;
            const result = await sPurchase.createPurchase(purchaseData, userId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error en controlador de compras:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    },

    async getPurchases(req, res) {
        try {
            const filterParams = req.query;
            const result = await sPurchase.getPurchases(filterParams);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error en controlador de compras:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    },

    async getDetailsPurchaseById(req, res) {
        try {
            const purchaseId = req.params.id;
            const result = await sPurchase.getDetailsPurchaseById(purchaseId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error en controlador de detalles de compra:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    }
};