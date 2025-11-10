import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mAuth = {
    async createUser(userData) {
        try {
            const insertQuery = `
                INSERT INTO users(
                    id, role_id, name, email, phone, password
                ) VALUES ( ?, ?, ?, ?, ?, ? )
            `;

            const result = await turso.execute({
                sql: insertQuery,
                args: [
                    userData.id,
                    userData.role_id,
                    userData.name,
                    userData.email,
                    userData.phone || null,
                    userData.password
                ]
            });

            if (result.rowsAffected === 0) {
                logger.error('Failed to create user: No rows affected', { email: userData.email });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create user',
                    data: null
                };
            }

            logger.info('User created successfully in database', { userId: userData.id, email: userData.email });

            return {
                success: true,
                code: 201,
                message: 'User created successfully',
                data: { userId: userData.id, email: userData.email }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('User creation failed: Duplicate entry', { email: userData.email });
                return {
                    success: false,
                    code: 409,
                    message: 'Email already exists',
                    data: null
                };
            }

            logger.error('Error creating user in database', { error: error.message, email: userData.email });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating user',
                data: null
            };
        }
    },

    async findByEmail(email) {
        try {
            const query = `
                SELECT 
                    u.id, u.name, u.email, u.password, r.name AS role_name,
                    u.account_locked_until, u.failed_login_attempts
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.email = ? AND u.status = 1
                LIMIT 1
            `;

            const result = await turso.execute({
                sql: query,
                args: [email]
            });

            if (result.rows.length === 0) {
                return null;
            }

            const user = {};
            result.columns.forEach((column, index) => {
                user[column] = result.rows[0][index];
            });

            return user;
        } catch (error) {
            logger.error('Error finding user by email', error);
            return null;
        }
    },

    async checkAdminExists() {
        try {
            const query = `
                SELECT EXISTS(
                    SELECT 1
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE r.id = 'admin'
                ) AS has_admin
            `;

            const result = await turso.execute(query);
            const adminExists = result.rows[0].has_admin;
            return adminExists === 1 ? true : false;
        } catch (error) {
            logger.error('Error checking if user is admin', error);
            return null;
        }
    },

    async createOrUpdateSession(sessionData) {
        try {
            await turso.execute({
                sql: 'DELETE FROM user_sessions WHERE user_id = ?',
                args: [sessionData.user_id]
            });

            const query = `
                INSERT INTO user_sessions (
                    id, user_id, token, device_info, 
                    ip_address, user_agent, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    sessionData.id,
                    sessionData.user_id,
                    sessionData.token,
                    sessionData.device_info || null,
                    sessionData.ip_address || null,
                    sessionData.user_agent || null,
                    sessionData.expires_at,
                ]
            });

            if (result.rowsAffected > 0) {
                logger.info('Session created successfully', {
                    sessionId: sessionData.id,
                    userId: sessionData.user_id
                });
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error creating session', error);
            return false;
        }
    },

    async registerLoginAttempt(attemptData) {
        try {
            const query = `
                INSERT INTO login_attempts (
                    id, email, ip_address, user_agent,
                    success, failure_reason
                ) VALUES ( ?, ?, ?, ?, ?, ? )
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    attemptData.id,
                    attemptData.email,
                    attemptData.ip_address,
                    attemptData.user_agent || null,
                    attemptData.success ? 1 : 0,
                    attemptData.failure_reason || null
                ]
            });

            if (result.rowsAffected === 0) {
                return false;
            }

            logger.info('Login attempt logged', { attemptId: attemptData.id, email: attemptData.email });

            return true;
        } catch (error) {
            logger.error('Error logging login attempt', error);
            return false;
        }
    },

    async incrementFailedLoginAttempts(userId) {
        try {
            const query = `
                UPDATE users
                SET failed_login_attempts = CASE 
                        WHEN failed_login_attempts < 10 THEN failed_login_attempts + 1
                        ELSE failed_login_attempts
                    END,
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?
                RETURNING failed_login_attempts;
            `;
            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            if (result.rowsAffected === 0) {
                return { success: false, failedLoginAttempts: 0 };
            }

            const attempts = result.rows?.[0]?.[0] ?? 0;
            return {
                success: true,
                failedLoginAttempts: attempts
            };
        } catch (error) {
            logger.error('Error incrementing failed login attempts', error);
            return { success: false, failedLoginAttempts: 0 };
        }
    },

    async lockUserAccount(userId, durationMinutes = 15) {
        try {
            const query = `
                UPDATE users
                SET 
                    account_locked_until = datetime('now', '+' || ? || ' minutes', '-5 hours'),
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [durationMinutes, userId]
            });

            return result.rowsAffected > 0;
        } catch (error) {
            logger.error('Error locking user account', error);
            return false;
        }
    },

    async resetFailedLoginAttempts(userId) {
        try {
            const query = `
                UPDATE users
                SET failed_login_attempts = 0,
                    account_locked_until = NULL,
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            return result.rowsAffected > 0;
        } catch (error) {
            logger.error('Error resetting failed login attempts', error);
            return false;
        }
    },

    async registerLastLogin(userId) {
        try {
            const query = `
                UPDATE users
                SET last_login = datetime('now', '-5 hours'),
                    updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [userId]
            });

            return result.rowsAffected > 0;
        } catch (error) {
            logger.error('Error registering last login', error);
            return false;
        }
    },

    async verifySessionToken(token) {
        try {
            const query = `
                SELECT 
                    s.*,
                    u.id as user_id,
                    u.name,
                    u.email,
                    u.status,
                    u.role_id,
                    r.name as role_name
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                JOIN roles r ON u.role_id = r.id
                WHERE s.token = ? 
                AND s.is_active = 1 
                AND s.expires_at > datetime('now', '-5 hours')
            `;

            const result = await turso.execute({
                sql: query,
                args: [token]
            });

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error verifying session token', error);
            return null;
        }
    },

    async updateLastActivity(token) {
        try {
            const query = `
                UPDATE user_sessions
                SET last_activity = datetime('now', '-5 hours')
                WHERE token = ?
            `;

            const result = await turso.execute({
                sql: query,
                args: [token]
            });

            return result.rowsAffected > 0;
        } catch (error) {
            logger.error('Error updating last activity', error);
            return false;
        }
    },

    async logout(token) {
        try {
            const query = `
                UPDATE user_sessions
                SET
                    token = NULL, is_active = 0, 
                    closed_at = datetime('now', '-5 hours')
                WHERE token = ?
            `;

            const result = await turso.execute({
                sql: query,
                args: [token]
            });

            if (result.rowsAffected === 0) {
                logger.error('Failed to logout: No rows affected', { token });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to logout',
                    data: null
                };
            }

            logger.info('User logged out successfully', { token });

            return {
                success: true,
                code: 200,
                message: 'Logout successful',
                data: null
            };
        } catch (error) {
            logger.error('Error logging out', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while logging out',
                data: null
            };
        }
    },
};