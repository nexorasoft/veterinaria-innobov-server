import { mAuth } from "../models/mAuth.js";
import { logger } from "../utils/logger.js";

export default async function authenticateUser(req, res, next) {
    try {
        // Prioridad: Cookie firmada > Header Authorization (retrocompatibilidad)
        let token = req.signedCookies?.auth_token;
        
        // Si no hay cookie, intentar obtener del header (para APIs que no usan cookies)
        if (!token) {
            const header = req.headers['authorization'];
            token = header && header.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token not provided'
            });
        }

        // Verificar que la sesión existe y es válida
        const session = await mAuth.verifySessionToken(token);
        if (!session || session === null) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        // Verificar que la cuenta esté activa
        if (session.status !== 1) {
            return res.status(403).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated'
            });
        }

        // Actualizar última actividad
        const updated = await mAuth.updateLastActivity(session.token);
        if (!updated) {
            logger.warn('Failed to update last activity for session', { sessionId: session.id });
        }

        // Agregar información del usuario a req
        req.user = {
            id: session.user_id,
            name: session.name,
            email: session.email,
            role_id: session.role_id,
            session_id: session.id
        };

        next();
    } catch (error) {
        logger.error('Error in authenticateUser middleware', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred while processing your request'
        });
    }
};