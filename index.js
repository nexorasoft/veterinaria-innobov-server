import express from 'express';
import cookieParser from 'cookie-parser';
import { PORT, NODE_ENV, COOKIE_SECRET } from './src/config/env.js';
import routes from './src/routes/index.js';
import { logger } from './src/utils/logger.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import { corsMiddleware } from './src/middlewares/cors.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(COOKIE_SECRET)); // Cookie parser con secret para cookies firmadas
app.use(corsMiddleware);

app.use(requestLogger);

app.use('/api', routes);

app.listen(PORT, () => {
    console.log(`
🚀 VETERINARIA API Server is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${NODE_ENV || 'development'}
🌐 Port: ${PORT}
🔗 Local URL: http://localhost:${PORT}
📚 API Base: http://localhost:${PORT}/api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Framework: Express.js
🗄️  Database: Turso (SQLite)
🚀 Runtime: ${process.version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    if (NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    if (NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

export default app;