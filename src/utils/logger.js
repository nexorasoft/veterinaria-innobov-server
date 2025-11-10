import { NODE_ENV } from '../config/env.js';

const isProduction = NODE_ENV === 'production';

const formatMessage = (level, message, meta = null) => {
    const date = new Date();

    const localDate = date;
    const timestamp = localDate.toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        hour12: false,
    });

    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
};


export const logger = {
    info: (message, meta = null) => {
        console.log(formatMessage('INFO', message, meta));
    },

    error: (message, error = null) => {
        const meta = error ? {
            message: error.message,
            stack: !isProduction ? error.stack : undefined,
            code: error.code
        } : null;
        console.error(formatMessage('ERROR', message, meta));
    },

    warn: (message, meta = null) => {
        console.warn(formatMessage('WARN', message, meta));
    },

    debug: (message, meta = null) => {
        if (!isProduction) {
            console.debug(formatMessage('DEBUG', message, meta));
        }
    }
};
