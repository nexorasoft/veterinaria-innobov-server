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
    },

    async getLogs(filters) {
        try {
            const {
                page, limit,
                user_id, module, action,
                start_date, end_date,
                search
            } = filters;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const args = [];

            let whereClause = "WHERE 1=1";

            if (user_id) {
                whereClause += " AND a.user_id = ?";
                args.push(user_id);
            }
            if (module) {
                whereClause += " AND a.module = ?";
                args.push(module);
            }
            if (action) {
                whereClause += " AND a.action = ?";
                args.push(action);
            }
            if (start_date) {
                whereClause += " AND date(a.created_at) >= date(?)";
                args.push(start_date);
            }
            if (end_date) {
                whereClause += " AND date(a.created_at) <= date(?)";
                args.push(end_date);
            }
            if (search) {
                whereClause += " AND (a.details LIKE '%' || ? || '%' OR u.name LIKE '%' || ? || '%')";
                args.push(search, search);
            }

            const query = `
                SELECT 
                    a.id,
                    a.action,     
                    a.module,      
                    a.created_at,
                    u.name as user_name,
                    u.role_id as user_role,
                    COUNT(a.id) OVER() AS total_count
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ${whereClause}
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?;
            `;

            args.push(limitNum, offset);

            const result = await turso.execute({
                sql: query,
                args: args
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No audit logs found',
                    data: null
                };
            }

            const total = result.rows[0]?.total_count || 0;
            const logs = result.rows.map(({ total_count, ...log }) => log);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Audit logs retrieved successfully',
                data: {
                    logs,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            console.log('Error retrieving audit logs:', error);
            logger.error('Error retrieving audit logs', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving audit logs',
                data: null
            };
        }
    },

    async getLogById(logId) {
        try {
            const query = `
                SELECT
                    a.*,
                    u.name as user_name,
                    u.role_id as user_role,
                    u.email as user_email
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [logId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Audit log not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Audit log retrieved successfully',
                data: result.rows[0]
            };
        } catch (error) {
            console.log('Error retrieving audit log by ID:', error);
            logger.error('Error retrieving audit log by ID', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving the audit log',
                data: null
            };
        }
    },

    async getFilterOptions() {
        try {
            const modulesSql = `SELECT DISTINCT module FROM audit_logs ORDER BY module ASC`;
            const actionsSql = `SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`;

            const [modRes, actRes] = await Promise.all([
                turso.execute(modulesSql),
                turso.execute(actionsSql)
            ]);

            return {
                success: true,
                code: 200,
                message: 'Filter options retrieved successfully',
                data: {
                    modules: modRes.rows.map(row => row.module),
                    actions: actRes.rows.map(row => row.action)
                }
            };
        } catch (error) {
            console.log('Error retrieving filter options:', error);
            logger.error('Error retrieving filter options', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving filter options',
                data: null
            };
        }
    },

    async getStats() {
        try {
            const dailySql = `
                SELECT date(created_at) as date, COUNT(*) as count
                FROM audit_logs
                WHERE created_at >= date('now', '-8 days')
                GROUP BY date(created_at)
                ORDER BY date(created_at) ASC;
            `;

            const modulesSql = `
                SELECT module, COUNT(*) as count
                FROM audit_logs
                GROUP BY module
                ORDER BY count DESC
                LIMIT 5;
            `;

            const usersSql = `
                SELECT u.name, COUNT(*) as count
                FROM audit_logs a
                JOIN users u ON a.user_id = u.id
                WHERE date(a.created_at) = date('now', '-5 hours')
                GROUP BY u.name
                ORDER BY count DESC
                LIMIT 5;
            `;

            const [dailyRes, modulesRes, usersRes] = await Promise.all([
                turso.execute(dailySql),
                turso.execute(modulesSql),
                turso.execute(usersSql)
            ]);
            
            return {    
                success: true,
                code: 200,
                message: 'Audit log statistics retrieved successfully',
                data: {
                    dailyActivity: dailyRes.rows,
                    topModules: modulesRes.rows,
                    topUsers: usersRes.rows
                }
            };
        } catch (error) {
            console.log('Error retrieving audit log statistics:', error);
            logger.error('Error retrieving audit log statistics', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while retrieving audit log statistics',
                data: null
            };
        }
    },
};