import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Captura cuando la respuesta finaliza
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        };

        if (res.statusCode >= 400) {
            logger.warn('Request completed with error', logData);
        } else {
            logger.info('Request completed', logData);
        }
    });

    next();
};
