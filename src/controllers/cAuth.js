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

            if (result.success && result.data?.token) {
                res.cookie('auth_token', result.data.token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    signed: true,
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });

                const { token, ...dataWithoutToken } = result.data;

                return res.status(result.code).json({
                    ...result,
                    data: dataWithoutToken
                });
            }

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
    },

    async logout(req, res) {
        try {
            const token = req.signedCookies.auth_token ||
                (req.headers['authorization']?.split(' ')[1]);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: 'Token not provided',
                    data: null
                });
            }

            const result = await sAuth.logout(token);

            if (result.success) {
                res.clearCookie('auth_token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    signed: true,
                    sameSite: 'strict'
                });
            }

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in logout controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async verifySession(req, res) {
        try {
            logger.debug('Session verification requested', {
                userId: req.user?.id
            });

            return res.status(200).json({
                success: true,
                code: 200,
                message: 'Session is valid',
                data: {
                    userId: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role_id,
                    role_name: req.user.role_name,
                    sessionId: req.user.session_id
                }
            });
        } catch (error) {
            logger.error('Error in verifySession controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },
}