import { mUser } from "../models/mUser.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export const sUser = {
    async getAllUsers() {
        try {
            const result = await mUser.getAll();
            return result;
        } catch (error) {
            logger.error('Error in getAllUsers service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async createUser(body) {
        try {
            const { name, email, password, role_id } = body;

            if (!name || !email || !password || !role_id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Missing required fields',
                    data: null
                };
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const userData = {
                id: uuidv4(),
                role_id,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                phone: body.phone ? body.phone.trim() : null
            }

            const result = await mUser.create(userData);
            return result;
        } catch (error) {
            logger.error('Error in createUser service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getDetail(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID is required',
                    data: null
                };
            }

            const result = await mUser.getById(userId);
            return result;
        } catch (error) {
            logger.error('Error in getDetail service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async updateUser(id, body) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID is required',
                    data: null
                };
            }

            const cleanData = {};
            if (body.name) cleanData.name = body.name.trim();
            if (body.email) cleanData.email = body.email.trim().toLowerCase();
            if (body.phone) cleanData.phone = body.phone.trim();
            if (body.role_id) cleanData.role_id = body.role_id;

            if (Object.keys(cleanData).length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No valid fields to update',
                    data: null
                };
            }

            const result = await mUser.update(id, cleanData);
            return result;
        } catch (error) {
            logger.error('Error in updateUser service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async toggleStatus(id, isActive) {
        try {
            console.log('toggleStatus called with:', { id, isActive });
            if (!id || isActive === undefined) {
                return {
                    success: false,
                    code: 400,
                    message: 'User ID and status are required',
                    data: null
                };
            }

            const statusInt = isActive ? 1 : 0;
            const result = await mUser.toggleStatus(id, statusInt);
            return result;
        } catch (error) {
            logger.error('Error in toggleStatus service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async adminResetPassword(id, newPassword) {
        try {
            if (!newPassword || newPassword.length < 6) {
                return {
                    success: false,
                    code: 400,
                    message: 'La contraseña debe tener al menos 6 caracteres',
                    data: null
                };
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            const result = await mUser.updatePassword(id, hashedPassword);
            return result;
        } catch (error) {
            logger.error('Error in adminResetPassword service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async changeMyPassword(userId, body) {
        try {
            const { current_password, new_password } = body;

            if (!current_password || !new_password) {
                return {
                    success: false,
                    code: 400,
                    message: 'Current and new passwords are required',
                    data: null
                };
            }

            const currentHash = await mUser.getPasswordHash(userId);
            if (!currentHash) {
                return {
                    success: false,
                    code: 404,
                    message: 'User not found',
                    data: null
                };
            }

            const validPassword = await bcrypt.compare(current_password, currentHash);
            if (!validPassword) {
                return {
                    success: false,
                    code: 401,
                    message: 'Current password is incorrect',
                    data: null
                };
            }

            if (new_password.length < 6) {
                return {
                    success: false,
                    code: 400,
                    message: 'New password must be at least 6 characters long',
                    data: null
                };
            }

            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(new_password, salt);
            const result = await mUser.updatePassword(userId, hashedNewPassword);
            return result;
        } catch (error) {
            logger.error('Error in changeMyPassword service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getRoles() {
        try {
            const result = await mUser.getRoles();
            return result;
        } catch (error) {
            logger.error('Error in getRoles service:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
};
