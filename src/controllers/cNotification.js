import { sNotification } from "../services/sNotification.js";
import { logger } from "../utils/logger.js";

export const cNotification = {
    async getNotificationsByUserId(req, res) {
        try {
            const currentUserId = req.user ? req.user.id : req.body.user_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sNotification.getNotificationsByUserId(currentUserId, page, limit  );
            return res.status(result.code).json({
                success: result.success,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            logger.error('cNotifications.getNotificationsByUserId: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving notifications.',
                data: null
            });
        }
    },

    async markNotificationAsSeen(req, res) {
        try {
            const notificationId = req.params.id;
            const result = await sNotification.markNotificationAsSeen(notificationId);
            return res.status(result.code).json({
                success: result.success,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            logger.error('cNotifications.markNotificationAsSeen: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating the notification.',
                data: null
            });
        }
    },

    async getNotificationsByUserIdLimitFive(req, res) {
        try {
            const currentUserId = req.user ? req.user.id : req.body.user_id;
            const result = await sNotification.getNotificationsByUserIdLimitFive(currentUserId);
            return res.status(result.code).json({
                success: result.success,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            logger.error('cNotifications.getNotificationsByUserIdLimitFive: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving notifications.',
                data: null
            });
        }
    },

    async getDetail(req, res) {
        try {
            const notificationId = req.params.id;
            const result = await sNotification.getDetail(notificationId);
            return res.status(result.code).json({
                success: result.success,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            logger.error('cNotifications.getDetail: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while retrieving the notification detail.',
                data: null
            });
        }
    }
};