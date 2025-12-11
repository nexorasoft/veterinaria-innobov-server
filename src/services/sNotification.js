import { turso } from "../database/index.js";
import pusher from "../utils/pusher.js";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "../utils/logger.js";
import { mNotification } from "../models/mNotification.js";

export const sNotification = {
    async create(userId, data) {
        try {
            const id = uuidv4();
            const notificationData = {
                id,
                user_id: userId,
                title: data.title,
                message: data.message,
                type: data.type,
                priority: data.priority,
                related_entity_type: data.related_entity_type,
                related_entity_id: data.related_entity_id
            };

            const inserted = await mNotification.insertNotification(notificationData);
            if (!inserted) {
                logger.error('Failed to insert notification into database');
                return false;
            }

            await pusher.trigger(`notifications-${userId}`, "new-notification", {
                id,
                title: data.title,
                message: data.message,
                type: data.type,
                timestamp: new Date().toISOString()
            });

            return true;
        } catch (error) {
            logger.error('Error creating notification:', error);
            return false;
        }
    },

    async getNotificationsByUserId(userId, page, limit) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID is required.',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));



            const result = await mNotification.getNotificationsByUserId(userId, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error getting notifications by user ID:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving notifications.',
                data: null
            };
        }
    },

    async markNotificationAsSeen(notificationId) {
        try {
            if (!notificationId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Notification ID is required.',
                    data: null
                };
            }

            const result = await mNotification.markNotificationAsSeen(notificationId);
            return result;
        } catch (error) {
            logger.error('Error marking notification as seen:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while updating the notification.',
                data: null
            };
        }
    },

    async getNotificationsByUserIdLimitFive(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID is required.',
                    data: null
                };
            }

            const result = await mNotification.getNotificationsByUserIdLimitFive(userId);
            return result;
        } catch (error) {
            logger.error('Error getting notifications by user ID:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving notifications.',
                data: null
            };
        }
    },

    async getDetail(notificationId) {
        try {
            if (!notificationId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Notification ID is required.',
                    data: null
                };
            }

            const result = await mNotification.getDetail(notificationId);
            return result;
        } catch (error) {
            logger.error('Error getting notification detail:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving the notification detail.',
                data: null
            };
        }
    }
};