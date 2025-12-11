import cron from 'node-cron';
import { mReceivable } from '../models/mReceivable.js';
import { mPayable } from '../models/mPayable.js';
import { mSend } from '../models/mSend.js';
import { sNotification } from '../services/sNotification.js';
import { logger } from '../utils/logger.js';

cron.schedule(
    '0 8 * * *',
    async () => {
        logger.info('Running daily accounts check job');

        try {
            const recipients = await mSend.getIdsByRoles(['admin', 'accountant']);
            if (!recipients?.length) return;

            /* CUENTAS POR COBRAR */
            const receivables = await mReceivable.getUpcomingReceivables(7);

            if (receivables.success && receivables.data.length > 0) {
                const notificationData = {
                    title: 'Cuentas por cobrar próximas a vencer',
                    message: `Hay ${receivables.data.length} cuentas por cobrar que vencen en los próximos 7 días.`,
                    type: 'CUENTAS_POR_COBRAR',
                    priority: 'MEDIA',
                    related_entity_type: 'accounts_receivable'
                };

                await Promise.all(
                    recipients.map(userId =>
                        sNotification.create(userId, notificationData)
                    )
                );
            }

            /* CUENTAS POR PAGAR */
            const payables = await mPayable.getUpcomingPayables(7);

            if (payables.success && payables.data.length > 0) {
                const notificationData = {
                    title: 'Cuentas por pagar próximas a vencer',
                    message: `Hay ${payables.data.length} cuentas por pagar que vencen en los próximos 7 días.`,
                    type: 'CUENTAS_POR_PAGAR',
                    priority: 'MEDIA',
                    related_entity_type: 'accounts_payable'
                };

                await Promise.all(
                    recipients.map(userId =>
                        sNotification.create(userId, notificationData)
                    )
                );
            }

        } catch (error) {
            logger.error('Error running daily accounts check job:', error);
        }
    },
    {
        timezone: 'America/Guayaquil'
    }
);

logger.info('Accounts check cron job loaded');