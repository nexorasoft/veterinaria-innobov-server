import { sSales } from "../services/sSales.js";
import { logger } from "../utils/logger.js";

export const cSales = {
    async searchCatalog(req, res) {
        try {
            const queryParams = req.query;
            const result = await sSales.searchCatalog(queryParams);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('cSales.searchCatalog: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while processing the request.',
                data: null
            });
        }
    },

    async registerSale(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;

            if(!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required to register a sale.',
                    data: null
                });
            }

            const saleData = req.body;

            const result = await sSales.registerSale(userId, saleData);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('cSales.registerSale: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while processing the request.',
                data: null
            });
        }
    },

    async lookupClient(req, res) {
        try {
            const clientData = req.body;

            const result = await sSales.lookupClient(clientData);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('cSales.lookupClient: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while processing the request.',
                data: null
            });
        }
    }
};