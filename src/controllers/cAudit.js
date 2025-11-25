import { sAudit } from "../services/sAudit.js";
import { logger } from "../utils/logger.js";

export const cAudit = {
    async getLogs(req, res) {
        try {
            const queryParams = req.query;
            const specificUserId = req.params.userId || null;

            logger.debug('Get Audit Logs request received', {
                queryParams,
                specificUserId
            });

            const result = await sAudit.getLogs(queryParams, specificUserId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getLogs controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },



    async getMyActivity(req, res) {
        try {
            const currentUserId = req.user ? req.user.id : req.body.user_id;
            const queryParams = req.query;

            logger.debug('Get My Activity request received', {
                currentUserId,
                queryParams
            });

            const result = await sAudit.getMyActivity(currentUserId, queryParams);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getMyActivity controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getLogById(req, res) {
        try {
            const result = await sAudit.getLogById(req.params.logId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getLogById controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getFilterOptions(req, res) {
        try {
            const result = await sAudit.getFilterOptions();
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getFilterOptions controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getStats(req, res) {
        try {
            const result = await sAudit.getStats();
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getStats controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};