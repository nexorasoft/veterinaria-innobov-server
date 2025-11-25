import { mAudit } from "../models/mAudit.js";
import { logger } from "../utils/logger.js";

export const sAudit = {
    async getLogs(queryParams, specificUserId = null) {
        try {
            const page = parseInt(queryParams.page) || 1;
            const limit = parseInt(queryParams.limit) || 50;

            const filters = {
                page,
                limit,
                user_id: specificUserId || queryParams.user_id,
                module: queryParams.module,
                action: queryParams.action,
                start_date: queryParams.start_date,
                end_date: queryParams.end_date,
                search: queryParams.search
            };

            const result = await mAudit.getLogs(filters);
            return result;
        } catch (error) {
            logger.error('Error in sAudit.getLogs:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving audit logs',
                data: null
            }
        }
    },

    async getMyActivity(userId, queryParams) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID is required',
                    data: null
                };
            }

            const page = parseInt(queryParams.page) || 1;
            const limit = parseInt(queryParams.limit) || 50;

            const result = await mAudit.getLogs({ user_id: userId, page, limit });
            return result;
        } catch (error) {
            logger.error('Error in sAudit.getMyActivity:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving user activity',
                data: null
            };
        }
    },

    async getLogById(logId) {
        try {
            if (!logId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Log ID is required',
                    data: null
                };
            }

            const result = await mAudit.getLogById(logId);
            if (!result.success) {
                return result;
            }
            if (result.data.new_values) result.data.new_values = JSON.parse(result.data.new_values);
            if (result.data.details) result.data.details = JSON.parse(result.data.details);

            return result;
        } catch (error) {
            logger.error('Error in sAudit.getLogById:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving audit log',
                data: null
            };
        }
    },

    async getFilterOptions() {
        try {
            const result = await mAudit.getFilterOptions();
            return result;
        } catch (error) {
            logger.error('Error in sAudit.getFilterOptions:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving filter options',
                data: null
            };
        }
    },

    async getStats() {
        try {
            const result = await mAudit.getStats();
            return result;
        } catch (error) {
            logger.error('Error in sAudit.getStats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving audit stats',
                data: null
            };
        }
    }
};