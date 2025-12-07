import { BREVO_TOKEN } from '../config/env.js';
import { logger } from './logger.js';

export const BrevoConfig = {
    async sendEmail(subject, to, htmlContent, sender, retries = 3, delay = 1000) {
        if (!to?.email || !htmlContent) {
            logger.error('Destinatario o contenido del email no proporcionado.');
            return null;
        }

        const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
        const brevoToken = BREVO_TOKEN;

        const payload = {
            sender: { name: sender.name, email: sender.email },
            to: [{ email: to.email, name: to.name }],
            subject: subject,
            htmlContent: htmlContent,
            replyTo: { email: sender.email, name: sender.name }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            logger.info(`Enviando email a ${to.email}. Intento actual: ${4 - retries}/3`);

            const response = await fetch(brevoApiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'api-key': brevoToken
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status >= 400 && response.status < 500) {
                const errorText = await response.text();
                const error = new Error(`Error Cliente Brevo (${response.status}): ${errorText}`);
                error.shouldRetry = false;
                throw error;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error Servidor Brevo (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('Email enviado exitosamente ID:', result.messageId);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            clearTimeout(timeoutId);

            const isRetryable = error.shouldRetry !== false;

            logger.error(`Error enviando email: ${error.message}`);

            if (retries > 0 && isRetryable) {
                logger.info(`Error temporal detectado. Reintentando en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendEmail(subject, to, htmlContent, sender, retries - 1, delay * 2);
            }

            return { success: false, error: error.message };
        }
    }
};