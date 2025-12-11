import cron from 'node-cron';
import { mVaccination } from '../models/mVaccination.js';
import { sNotification } from '../services/sNotification.js';
import { mSend } from '../models/mSend.js';
import { logger } from '../utils/logger.js';

cron.schedule(
    '0 8 * * *',
    async () => {
        logger.info('Running daily vaccine check job');

        try {
            const upcoming = await mVaccination.getUpcoming(7);
            if (!upcoming.success || upcoming.data.length === 0) return;

            const recipients = await mSend.getIdsByRoles(['admin', 'cashier']);
            if (!recipients?.length) return;

            const vaccineIds = upcoming.data.map(v => v.id).join(',');

            const notificationData = {
                title: 'Vacunas pendientes de aplicar',
                message: `Hay ${upcoming.data.length} vacunas programadas para los próximos 7 días.`,
                type: 'VACUNA',
                priority: 'MEDIA',
                related_entity_type: 'vaccination',
                related_entity_id: vaccineIds
            };

            await Promise.all(
                recipients.map(userId =>
                    sNotification.create(userId, notificationData)
                )
            );

        } catch (error) {
            logger.error('Error running vaccine check job:', error);
        }
    },
    {
        timezone: 'America/Guayaquil'
    }
);

logger.info('Vaccine check cron job loaded');