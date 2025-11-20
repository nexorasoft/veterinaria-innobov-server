import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mNotification = {
    async insertNotification(notificationData) {
        try {
            const query = `
                    INSERT INTO notifications (
                        id, title, message, type, priority, 
                        related_entity_type, related_entity_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

            await turso.execute({
                sql: query,
                args: [
                    notificationData.id,
                    notificationData.title,
                    notificationData.message,
                    notificationData.type,
                    notificationData.priority,
                    notificationData.related_entity_type || null,
                    notificationData.related_entity_id || null
                ]
            });

            logger.info('Notification inserted successfully:', notificationData.id);
            return true;
        } catch (error) {
            logger.error('Error inserting notification:', error);
            return false;
        }
    },
};