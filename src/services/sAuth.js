import { mAuth } from "../models/mAuth.js";
import { logger } from '../utils/logger.js';
import { getClientInfo } from "../utils/clientInfo.js";

import { v4 as uuidv4 } from 'uuid';
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token.js";

export const sAuth = {
    async register(userData) {
        try {
            const requiredFields = ['role_id', 'name', 'email', 'password'];

            const missingFields = requiredFields.filter(field =>
                !userData[field] || (typeof userData[field] === 'string' && userData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    code: 400,
                    data: null
                };
            }

            const normalizedEmail = userData.email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(normalizedEmail)) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid email format',
                    data: null
                };
            }

            if (userData.password.length < 8) {
                return {
                    success: false,
                    code: 400,
                    message: 'Password must be at least 8 characters long',
                    data: null
                };
            }

            logger.info('Starting user registration process', { email: normalizedEmail });

            const existingUserByEmail = await mAuth.findByEmail(normalizedEmail);
            if (existingUserByEmail) {
                logger.warn('Registration failed: Email already in use', { email: normalizedEmail });
                return {
                    success: false,
                    code: 409,
                    message: 'Email already in use',
                    data: null
                }
            }

            if (userData.role_id === 'admin') {
                const adminExists = await mAuth.checkAdminExists();

                if (adminExists === null) {
                    logger.error('Failed to verify if admin exists');
                    return {
                        success: false,
                        code: 500,
                        message: 'Internal server error while checking admin existence',
                        data: null
                    };
                }

                if (adminExists === true) {
                    logger.warn('Registration failed: Admin user already exists');
                    return {
                        success: false,
                        code: 409,
                        message: 'Admin user already exists',
                        data: null
                    };
                }
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const userToCreate = {
                id: uuidv4(),
                role_id: userData.role_id,
                name: userData.name.trim(),
                email: normalizedEmail,
                phone: userData.phone?.trim() || null,
                password: hashedPassword
            };

            const createdUser = await mAuth.createUser(userToCreate);

            if (!createdUser.success) {
                return createdUser;
            }

            logger.info('User registered successfully', {
                userId: createdUser.data.userId,
                email: normalizedEmail
            });

            return createdUser;
        } catch (error) {
            logger.error('Error during user registration', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error during registration',
                data: null
            };
        }
    },

    async login(email, password, req) {
        try {
            if (!email || !password || typeof email !== 'string' || typeof password !== 'string' ||
                email.trim() === '' || password.trim() === '') {
                return {
                    success: false,
                    message: 'Missing required fields: email and password',
                    code: 400,
                    data: null
                };
            }

            const normalizedEmail = email.trim().toLowerCase();
            logger.info('Starting user login process', { email: normalizedEmail });

            const user = await mAuth.findByEmail(normalizedEmail);
            if (!user) {
                logger.warn('Login failed: User not found', { email: normalizedEmail });
                return {
                    success: false,
                    code: 404,
                    message: 'Invalid credentials',
                    data: null
                }
            }

            if (user.account_locked_until) {
                const lockedUntil = new Date(user.account_locked_until + 'Z');
                const now = new Date();
                const localNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);

                if (lockedUntil > localNow) {
                    logger.warn('Login failed: Account is locked', { email: normalizedEmail });
                    return {
                        success: false,
                        code: 403,
                        message: 'Account is locked. Please try again later.',
                        data: null
                    };
                }
            }

            const { ip_address, user_agent } = getClientInfo(req);

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                logger.warn('Login failed: Invalid password', { email: normalizedEmail });

                const [, incremented] = await Promise.all([
                    mAuth.registerLoginAttempt({
                        id: uuidv4(),
                        email: normalizedEmail,
                        ip_address,
                        user_agent,
                        success: false,
                        failure_reason: 'Invalid password'
                    }),
                    mAuth.incrementFailedLoginAttempts(user.id)
                ]);

                if (incremented && incremented.failedLoginAttempts >= 10) {
                    await mAuth.lockUserAccount(user.id).catch(err =>
                        logger.error('Failed to lock user account', { userId: user.id, error: err })
                    );
                }

                return {
                    success: false,
                    code: 401,
                    message: 'Invalid credentials',
                    data: null
                }
            }

            logger.info('User logged in successfully', { userId: user.id, email: normalizedEmail });

            const token = generateToken({ id: user.id }, '7d');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 días
            const expiresAtMinus5 = new Date(expiresAt.getTime() - 5 * 60 * 60 * 1000); // -5 horas
            const formattedExpiresAt = expiresAtMinus5.toISOString().slice(0, 19).replace('T', ' ');

            await Promise.all([
                mAuth.resetFailedLoginAttempts(user.id),
                mAuth.registerLoginAttempt({
                    id: uuidv4(),
                    email: normalizedEmail,
                    ip_address,
                    user_agent,
                    success: true,
                    failure_reason: null
                }),
                mAuth.registerLastLogin(user.id),
                mAuth.createOrUpdateSession({
                    id: uuidv4(),
                    user_id: user.id,
                    token,
                    device_info: user_agent,
                    ip_address,
                    user_agent,
                    expires_at: formattedExpiresAt
                })
            ]).catch(err => {
                logger.error('Error in post-login operations', { userId: user.id, error: err });
            });

            return {
                success: true,
                code: 200,
                message: 'Login successful',
                data: {
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    token
                }
            }
        } catch (error) {
            logger.error('Error during user login', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error during login',
                data: null
            };
        }
    },

    async logout(token) {
        try {
            const result = await mAuth.logout(token);
            return result;
        } catch (error) {
            logger.error('Error during user logout', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error during logout',
                data: null
            };
        }
    },
};