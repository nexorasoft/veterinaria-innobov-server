import { mClient } from "../models/mClient.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sClient = {
    async getOrCreateClient(clientData) {
        try {
            const requiredFields = ['dni', 'name', 'phone'];

            const missingFields = requiredFields.filter(field =>
                !clientData[field] || (typeof clientData[field] === 'string' && clientData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    code: 400,
                    data: null
                };
            }

            const newClientData = {
                id: uuidv4(),
                dni: clientData.dni || null,
                name: clientData.name.trim(),
                phone: clientData.phone.trim(),
                email: clientData.email || null,
                address: clientData.address || null,
                emergency_contact: clientData.emergency_contact || null,
                emergency_phone: clientData.emergency_phone || null,
                notes: clientData.notes || null
            };

            const result = await mClient.getOrCreateClient(newClientData);

            return result;
        } catch (error) {
            logger.error('Error in getOrCreateClient service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while getting or creating client',
                data: null
            };
        }
    },
};