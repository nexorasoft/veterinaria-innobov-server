import { v4 as uuidv4 } from 'uuid';
import { mAudit } from '../models/mAudit.js';
import { logger } from '../utils/logger.js';
import { getClientInfo } from '../utils/clientInfo.js';

export const auditLog = (action, module, entityType = null) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        const { ip_address, user_agent } = getClientInfo(req);
        res.json = async function (data) {
            try {
                const logData = {
                    id: uuidv4(),
                    user_id: req.user?.id || null,
                    action,
                    module,
                    entity_type: entityType,
                    entity_id: data?.id || req.params?.id || null,
                    old_values: null,
                    new_values: JSON.stringify(req.body) || null,
                    ip_address: ip_address,
                    user_agent: user_agent,
                    details: JSON.stringify({
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        statusCode: res.statusCode
                    })
                };

                await mAudit.logAction(logData);
            } catch (error) {
                logger.error('Error in audit middleware', error);
            }

            return originalJson(data);
        };

        next();
    };
};

