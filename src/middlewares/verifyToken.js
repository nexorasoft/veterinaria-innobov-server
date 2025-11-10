import { mAuth } from "../models/mAuth.js";
import { logger } from "../utils/logger.js";

export default async function authenticateUser(req, res, next) {
    try {
        const header = req.headers['authorization'];
        const token = header && header.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token not provided'
            });
        }

        const session = await mAuth.verifySessionToken(token);
        if (!session || session === null) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        if (session.status !== 1) {
            return res.status(403).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated'
            });
        }

        const updated = await mAuth.updateLastActivity(session.token);
        if (!updated) {
            logger.warn('Failed to update last activity for session', { sessionId: session.id });
        }

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