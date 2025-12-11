import cron from 'node-cron';
import { mProduct } from '../models/mProduct.js';
import { sNotification } from '../services/sNotification.js';
import { mSend } from '../models/mSend.js';
import { logger } from '../utils/logger.js';

cron.schedule(
    '56 13 * * *',
    async () => {
        logger.info('Running daily product expiration check job');

        try {
            const expiringProducts = await mProduct.getExpiringProducts(30);
            if (!expiringProducts.success || expiringProducts.data.length === 0) return;

            const recipients = await mSend.getIdsByRoles(['admin', 'cashier']);
            if (!recipients?.length) return;

            const productIds = expiringProducts.data.map(p => p.id).join(',');

            const notificationData = {
                title: 'Productos próximos a vencer',
                message: `Hay ${expiringProducts.data.length} productos que vencerán en los próximos 30 días.`,
                type: 'RECORDATORIO',
                priority: 'ALTA',
                related_entity_type: 'product',
                related_entity_id: productIds
            };

            await Promise.all(
                recipients.map(userId =>
                    sNotification.create(userId, notificationData)
                )
            );
        } catch (error) {
            logger.error('Error running daily product expiration check job:', error);
        }
    },
    {
        timezone: 'America/Guayaquil'
    }
)

logger.info('Product expiration check cron job loaded');