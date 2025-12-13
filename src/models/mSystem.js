import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mSystem = {
    async getTaxPercentage() {
        try {
            const query = `
                SELECT tax_percentage, code_tax
                FROM system_settings
                LIMIT 1;
            `;

            const result = await turso.execute(query);
            return {
                tax_percentage: result.rows[0]?.tax_percentage ?? null,
                code_tax: result.rows[0]?.code_tax ?? null
            };
        } catch (error) {
            logger.error('Error retrieving tax percentage:', error);
            return { tax_percentage: null, code_tax: null };
        }
    },

    async isSystemFresh() {
        try {
            const setupCountQuery = `SELECT COUNT(*) AS count FROM system_settings`;
            const userCountQuery = `SELECT COUNT(*) AS count FROM users WHERE role_id = 'admin'`;

            const [setupResult, userResult] = await Promise.all([
                turso.execute(setupCountQuery),
                turso.execute(userCountQuery)
            ]);

            const setupCount = setupResult.rows[0].count || 0;
            const userCount = userResult.rows[0].count || 0;

            return setupCount === 0 && userCount === 0;
        } catch (error) {
            logger.error('Error checking system status:', error);
            return false;
        }
    },

    async createSettings(settingsData) {
        const client = await turso.transaction();
        try {
            const userInsertQuery = `
                INSERT INTO users(
                    id, role_id, name, email, phone, password
                ) VALUES (?, ?, ?, ?, ?, ?);
            `

            const userResult = await client.execute({
                sql: userInsertQuery,
                args: [
                    settingsData.admin_id,
                    'admin',
                    settingsData.admin_name,
                    settingsData.admin_email,
                    settingsData.admin_phone || null,
                    settingsData.admin_password
                ]
            })

            if (userResult.rowsAffected === 0) {
                await client.rollback();
                return {
                    success: false,
                    code: 400,
                    message: 'Error al crear el usuario administrador.',
                    data: null
                };
            }

            const settingsInsertQuery = `
                INSERT INTO system_settings(
                    id, ruc, business_name, trade_name, address,
                    headquarters_address, establishment_address, phone,
                    email, establishment_code, emission_point, environment_type, 
                    emission_type, accounting_obligation, special_taxpayer, 
                    notification_email, certificate, certificate_password, 
                    logo_url, logo_public_id, tax_percentage
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            const settingsResult = await client.execute({
                sql: settingsInsertQuery,
                args: [
                    settingsData.settings_id,
                    settingsData.ruc,
                    settingsData.business_name,
                    settingsData.trade_name,
                    settingsData.address,
                    settingsData.headquarters_address,
                    settingsData.establishment_address,
                    settingsData.company_phone || null,
                    settingsData.company_email || null,
                    settingsData.establishment_code || '001',
                    settingsData.emission_point || '001',
                    settingsData.environment_type || 1,
                    settingsData.emission_type || 1,
                    settingsData.accounting_obligation || false,
                    settingsData.special_taxpayer || null,
                    settingsData.notification_email || null,
                    settingsData.certificate || null,
                    settingsData.certificate_password || null,
                    settingsData.logo_url || null,
                    settingsData.logo_public_id || null,
                    settingsData.tax_percentage || 15.0
                ]
            });

            if (settingsResult.rowsAffected === 0) {
                await client.rollback();
                return {
                    success: false,
                    code: 400,
                    message: 'Error al crear la configuración del sistema.',
                    data: null
                };
            }

            await client.commit();
            return {
                success: true,
                code: 201,
                message: 'Configuración del sistema creada exitosamente.',
                data: {
                    adminId: settingsData.admin_id,
                    settingsId: settingsData.settings_id
                }
            };
        } catch (error) {
            await client.rollback();
            logger.error('Error creating system settings:', error);

            if (error.message?.includes('UNIQUE constraint failed')) {
                if (error.message.includes('users.email')) {
                    return {
                        success: false,
                        message: 'Email already registered',
                        code: 400,
                        data: null
                    };
                }

                if (error.message.includes('system_settings.ruc') ||
                    error.message.includes('system_settings.establishment_code')) {
                    return {
                        success: false,
                        message: 'RUC and establishment code combination already exists',
                        code: 400,
                        data: null
                    };
                }
            }

            return {
                success: false,
                code: 500,
                message: 'Error de servidor al crear la configuración del sistema.',
                data: null
            };
        }
    },

    async getInfoCertificate() {
        try {
            const query = `
                SELECT certificate, certificate_password
                FROM system_settings
                LIMIT 1;
            `;

            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                return null;
            }

            return {
                certificate: result.rows[0].certificate,
                certificate_password: result.rows[0].certificate_password
            };
        } catch (error) {
            logger.error('Error retrieving certificate info:', error);
            return null;
        }
    }
};