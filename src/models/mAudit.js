import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mAudit = {
    async logAction(logData) {
        try {
            const query = `
                INSERT INTO audit_logs(
                    id, user_id, action, module, entity_type, 
                    entity_id, old_values, new_values, 
                    ip_address, user_agent, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    logData.id,
                    logData.user_id,
                    logData.action,
                    logData.module,
                    logData.entity_type,
                    logData.entity_id,
                    logData.old_values,
                    logData.new_values,
                    logData.ip_address,
                    logData.user_agent,
                    logData.details
                ]
            });

            logger.info('Audit log created', {
                action: logData.action,
                module: logData.module,
                userId: logData.user_id
            });

            return result.rowsAffected > 0;
        } catch (error) {
            console.log('Error creating audit log:', error);
            logger.error('Error creating audit log', error);
            return false;
        }
    }
};