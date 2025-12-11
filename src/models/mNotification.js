import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mNotification = {
    async insertNotification(notificationData) {
        try {
            const query = `
                    INSERT INTO notifications (
                        id, user_id, title, message, type, priority, 
                        related_entity_type, related_entity_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

            await turso.execute({
                sql: query,
                args: [
                    notificationData.id,
                    notificationData.user_id,
                    notificationData.title,
                    notificationData.message,
                    notificationData.type || 'SISTEMA',
                    notificationData.priority || 'MEDIA',
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

    async getNotificationsByUserId(userId, page = 1, limit = 20) {
        try {

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const query = `
                SELECT 
                    id, title, message, type, priority, seen, seen_at, created_at,
                    COUNT(*) OVER() as total_count
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?;
            `;
            const result = await turso.execute({
                sql: query,
                args: [userId, limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No notifications found for the user.',
                    data: null
                }
            }

            const total = result.rows[0]?.total_count || 0;
            const notifications = result.rows.map(({ total_count, ...notification }) => notification);
            const totalPages = Math.ceil(total / limitNum);


            return {
                success: true,
                code: 200,
                message: 'Notifications retrieved successfully.',
                data: {
                    notifications,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error fetching notifications:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while fetching notifications.',
                data: null
            }
        }
    },

    async markNotificationAsSeen(notificationId) {
        try {
            const query = `
                UPDATE notifications
                SET 
                    seen = 1, 
                    seen_at = datetime(CURRENT_TIMESTAMP, '-5 hours')
                WHERE id = ?;
            `;
            const result = await turso.execute({
                sql: query,
                args: [notificationId]
            });

            if (result.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Notification not found.',
                    data: null
                }
            }

            return {
                success: true,
                code: 200,
                message: 'Notification marked as seen successfully.',
                data: null
            };
        } catch (error) {
            logger.error('Error marking notification as seen:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while updating the notification.',
                data: null
            }
        }
    },

    async getNotificationsByUserIdLimitFive(userId) {
        try {
            const query = `
                SELECT 
                    id, title, message, type, priority, related_entity_type, 
                    related_entity_id, seen, seen_at, created_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `;
            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No notifications found for the user.',
                    data: null
                }
            }

            return {
                success: true,
                code: 200,
                message: 'Notifications retrieved successfully.',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching notifications:', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while fetching notifications.',
                data: null
            }
        }
    },

    async getDetail(id) {
        try {
            const query = `
            SELECT 
                n.id, 
                n.user_id, 
                n.title, 
                n.message, 
                n.type, 
                n.priority, 
                n.seen, 
                n.created_at,
                n.related_entity_type, 
                n.related_entity_id
            FROM notifications n
            WHERE n.id = ?;
        `;

            const result = await turso.execute({
                sql: query,
                args: [id]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Notificación no encontrada'
                };
            }

            const notification = result.rows[0];
            console.log('Fetching related entity for type:', notification);

            let relatedData = null;
            if (notification.related_entity_id && notification.related_entity_type) {
                try {
                    switch (notification.related_entity_type) {
                        case 'product': {
                            const ids = notification.related_entity_id
                                .split(',')
                                .map(id => id.trim())
                                .filter(Boolean);

                            if (ids.length === 0) {
                                relatedData = [];
                                break;
                            }

                            const placeholders = ids.map(() => '?').join(',');

                            const prodRes = await turso.execute({
                                sql: `
                                    SELECT id, name, code, stock, min_stock, expiration_date
                                    FROM products 
                                    WHERE id IN (${placeholders})
                                `,
                                args: ids
                            });

                            relatedData = prodRes.rows || [];
                            break;
                        }

                        case 'pet': {
                            relatedData = null;
                            break;
                        }

                        case 'vaccination': {
                            const ids = notification.related_entity_id
                                .split(',')
                                .map(id => id.trim())
                                .filter(Boolean);

                            if (ids.length === 0) {
                                relatedData = [];
                                break;
                            }

                            const placeholders = ids.map(() => '?').join(',');

                            const vacQuery = `
                                SELECT
                                    v.id AS vaccination_id,
                                    v.vaccine_name,
                                    v.next_due,
                                    p.id AS pet_id,
                                    p.name AS pet_name,
                                    c.id AS client_id,
                                    c.name AS client_name,
                                    c.phone AS client_phone
                                FROM vaccinations v
                                JOIN pets p ON v.pet_id = p.id
                                JOIN clients c ON p.client_id = c.id
                                WHERE v.id IN (${placeholders})
                                ORDER BY v.next_due ASC;
                            `;

                            const vacRes = await turso.execute({
                                sql: vacQuery,
                                args: ids
                            });

                            relatedData = vacRes.rows || [];
                            break;
                        }

                        case 'sale': {
                            const saleRes = await turso.execute({
                                sql: `
                                    SELECT id, total, status, created_at 
                                    FROM sales 
                                    WHERE id = ?
                                `,
                                args: [notification.related_entity_id]
                            });
                            relatedData = saleRes.rows[0] || null;
                            break;
                        }
                    }
                } catch (innerError) {
                    logger.warn(
                        `Could not fetch related entity for notification ${id}`,
                        innerError
                    );
                }
            }

            return {
                success: true,
                code: 200,
                data: {
                    ...notification,
                    related_data: relatedData
                }
            };

        } catch (error) {
            logger.error('Error fetching notification detail', error);
            return {
                success: false,
                code: 500,
                message: 'Error obteniendo el detalle de la notificación'
            };
        }
    }
};