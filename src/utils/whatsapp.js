import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { logger } from './logger.js';

// Inicializamos el cliente
const client = new Client({
    authStrategy: new LocalAuth(), // Guarda la sesión para no escanear siempre
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Necesario para servidores Linux/VPS
        headless: true // Navegador invisible
    }
});

let isReady = false;

// Evento: Generar QR
client.on('qr', (qr) => {
    logger.info('Escanea este QR con el WhatsApp de la Veterinaria:');
    qrcode.generate(qr, { small: true });
});

// Evento: Listo
client.on('ready', () => {
    isReady = true;
    logger.info('✅ WhatsApp conectado y listo para enviar mensajes.');
});

// Evento: Error de autenticación
client.on('auth_failure', msg => {
    logger.error('❌ Error de autenticación en WhatsApp:', msg);
});

// Inicializar
client.initialize();

export const WhatsAppService = {

    /**
     * Envía un PDF a un número
     * @param {string} phone - Número celular (ej: 0983059930)
     * @param {Buffer} pdfBuffer - El buffer del PDF generado
     * @param {string} fileName - Nombre del archivo (ej: factura-001.pdf)
     * @param {string} caption - Texto opcional
     */
    async sendPdf(phone, pdfBuffer, fileName, caption = '') {
        try {
            if (!isReady) {
                logger.warn('WhatsApp aún no está listo. Intenta en unos segundos.');
                return false;
            }

            // 1. Formatear el número para Ecuador (593...)
            // Quitamos el '0' inicial y agregamos '593'
            // Si viene 0983059930 -> 593983059930@c.us
            let cleanPhone = phone.replace(/\D/g, ''); // Solo números
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '593' + cleanPhone.substring(1);
            }
            const chatId = `${cleanPhone}@c.us`;

            // 2. Convertir Buffer a MessageMedia (Formato de la librería)
            const media = new MessageMedia(
                'application/pdf',
                pdfBuffer.toString('base64'),
                fileName
            );

            // 3. Enviar
            await client.sendMessage(chatId, media, { caption: caption });
            logger.info(`PDF enviado por WhatsApp a ${cleanPhone}`);
            return true;

        } catch (error) {
            logger.error('Error enviando WhatsApp:', error);
            return false;
        }
    }
};