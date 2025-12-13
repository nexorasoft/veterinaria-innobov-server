import { turso } from "../database/index.js";
import { getClientInfo } from "../utils/clientInfo.js";
import { logger } from "../utils/logger.js";

export const mSend = {
    async cashRegisterNotification(req, data) {
        try {
            const getInfoAdminQuery = `
                SELECT
                    name as name_admin,
                    email as email_admin 
                FROM users
                WHERE role_id = "admin"
                LIMIT 1
            `;

            const getInfoCashier = `
                SELECT name as name_cashier
                FROM users
                WHERE id = ?
                LIMIT 1
            `;

            const getInfoCash = `
                SELECT name as name_cash_register
                FROM cash_registers
                WHERE id = ?
                LIMIT 1
            `;

            const getInfoClinic = `
                SELECT trade_name as name_clinic
                FROM system_settings
                LIMIT 1
            `;

            const { ip_address, user_agent } = getClientInfo(req);

            const [adminInfo, cashierInfo, cashInfo, clinicInfo] = await Promise.all([
                turso.execute(getInfoAdminQuery),
                turso.execute({ sql: getInfoCashier, args: [data.user_id] }),
                turso.execute({ sql: getInfoCash, args: [data.cash_register_id] }),
                turso.execute(getInfoClinic)
            ]);

            const admin = adminInfo.rows[0].name_admin || null;
            const cashier = cashierInfo.rows[0].name_cashier || null;
            const cashRegister = cashInfo.rows[0].name_cash_register || null;
            const clinic = clinicInfo.rows[0].name_clinic || null;

            return {
                admin: { name: admin, email: adminInfo.rows[0].email_admin },
                cashier_name: cashier,
                cash_name: cashRegister,
                clinic_name: clinic,
                client_info: { ip_address, user_agent }
            }
        } catch (error) {
            logger.error('Error obteniendo información para notificación de caja', error);
            return null;
        }
    },

    async getIdsByRoles(rolesArray) {
        try {
            if (!rolesArray || rolesArray.length === 0) {
                return [];
            }

            const placeholders = rolesArray.map(() => '?').join(',');

            const query = `
                SELECT id 
                FROM users 
                WHERE role_id IN (${placeholders}) 
                AND status = 1;
            `;

            const result = await turso.execute({
                sql: query,
                args: rolesArray
            });

            return result.rows.map(row => row.id);
        } catch (error) {
            logger.error('Error obteniendo IDs de usuarios por roles', error);
            return null;
        }
    }
};