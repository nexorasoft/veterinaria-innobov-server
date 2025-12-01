import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mUser = {
    async getAll() {
        try {
            const query = `
                SELECT u.id, u.name, u.email, u.phone, u.status, 
                       r.name as role_name 
                FROM users u
                JOIN roles r ON u.role_id = r.id
                ORDER BY u.name ASC 
            `;

            const result = await turso.execute(query);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No users found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Users retrieved successfully',
                data: result.rows
            }
        } catch (error) {
            logger.error('Error fetching users:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async create(userData) {
        try {
            const sql = `
                INSERT INTO users (
                    id, role_id, name, email, password, phone, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now', '-5 hours'));
            `;

            const result = await turso.execute({
                sql: sql,
                args: [
                    userData.id,
                    userData.role_id,
                    userData.name,
                    userData.email,
                    userData.password,
                    userData.phone
                ]
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Failed to create user',
                    data: null
                };
            }

            return {
                success: true,
                code: 201,
                message: 'User created successfully',
                data: {
                    id: userData.id
                }
            };
        } catch (error) {
            logger.error('Error creating user:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getById(id) {
        try {
            const query = `
                SELECT 
                    u.id, u.name, u.email, u.phone, u.status, u.created_at,
                    u.role_id, r.name as role_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [id]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'User not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'User retrieved successfully',
                data: result.rows[0]
            };
        } catch (error) {
            logger.error('Error fetching user by ID:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async update(id, updateData) {
        try {
            const fields = [];
            const values = [];

            const allowedFields = ['name', 'email', 'phone', 'role_id'];

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No valid fields to update',
                    data: null
                };
            }

            values.push(id);

            const sql = `
                UPDATE users 
                SET ${fields.join(', ')}, updated_at = datetime('now', '-5 hours') 
                WHERE id = ?
            `;

            const result = await turso.execute({ sql, args: values });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'User not found or no changes made',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'User updated successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error updating user:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async toggleStatus(id, newStatus) {
        try {
            const sql = `
                UPDATE users 
                SET status = ?, updated_at = datetime('now', '-5 hours') 
                WHERE id = ?
            `;

            const result = await turso.execute({ sql, args: [newStatus, id] });
            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'User not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'User status updated successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error updating user status:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async updatePassword(id, newPassword) {
        try {
            const sql = `
                UPDATE users 
                SET password = ?, 
                    updated_at = datetime('now', '-5 hours'),
                    must_change_password = 0
                WHERE id = ?
            `;

            const result = await turso.execute({ sql, args: [newPassword, id] });
            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'User not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Password updated successfully',
                data: null
            };
        } catch (error) {
            logger.error('Error updating user password:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getPasswordHash(id) {
        try {
            const result = await turso.execute({
                sql: "SELECT password FROM users WHERE id = ?",
                args: [id]
            });
            return result.rows[0] ? result.rows[0].password : null;
        } catch (error) {
            logger.error('Error fetching user password hash:', error);
            return null;
        }
    },

    async getRoles() {
        try {

            const query = `SELECT id, name, description FROM roles WHERE active = 1`;
            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No roles found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Roles retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching roles:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
};