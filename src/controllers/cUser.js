import { sUser } from "../services/sUser.js";
import { logger } from "../utils/logger.js";

export const cUser = {
    async getAll(req, res) {
        try {
            const result = await sUser.getAllUsers();
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getAll controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async create(req, res) {
        try {
            const result = await sUser.createUser(req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in create controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getRoles(req, res) {
        try {
            const result = await sUser.getRoles();
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getRoles controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getMyProfile(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: 'Unauthorized',
                    data: null
                });
            }

            const result = await sUser.getDetail(userId);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getMyProfile controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async changeMyPassword(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: 'Unauthorized',
                    data: null
                });
            }

            const result = await sUser.changeMyPassword(userId, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in changeMyPassword controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getDetail(req, res) {
        try {
            const result = await sUser.getDetail(req.params.id);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getDetail controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async update(req, res) {
        try {
            const result = await sUser.updateUser(req.params.id, req.body);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in update controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async toggleStatus(req, res) {
        try {
            const active = req.body.active;
            const result = await sUser.toggleStatus(req.params.id, active);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in toggleStatus controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async resetPassword(req, res) {
        try {
            const result = await sUser.adminResetPassword(req.params.id, req.body.new_password);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in resetPassword controller:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                data: null
            });
        }
    }
};