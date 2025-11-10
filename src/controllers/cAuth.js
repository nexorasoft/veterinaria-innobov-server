import { sAuth } from "../services/sAuth.js";
import { logger } from '../utils/logger.js';

export const cAuth = {
    async register(req, res) {
        try {
            const userData = req.body;

            logger.debug('Register request received', {
                email: userData?.email,
                role_id: userData?.role_id
            });

            const result = await sAuth.register(userData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in register controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async login(req, res) {
        try {
            const loginData = req.body;

            logger.debug('Login request received', {
                email: loginData?.email
            });

            const result = await sAuth.login(loginData?.email, loginData?.password, req);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in login controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
}