import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mClient = {
    async getOrCreateClient(clientData) {
        try {

            const clientExistsQuery = `
                SELECT * FROM clients WHERE dni = ? LIMIT 1;  
            `;

            const existingClient = await turso.execute({
                sql: clientExistsQuery,
                args: [clientData.dni]
            });

            if (existingClient.rows.length > 0) {
                logger.info("Client already exists", { clientId: existingClient.rows[0].id, dni: clientData.dni });
                return {
                    success: true,
                    code: 200,
                    message: "Client already exists",
                    data: { id: existingClient.rows[0] }
                };
            }

            const query = `
                INSERT INTO clients (
                    id, dni, name, phone, email, address, 
                    emergency_contact, emergency_phone, notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    clientData.id,
                    clientData.dni,
                    clientData.name,
                    clientData.phone,
                    clientData.email || null,
                    clientData.address || null,
                    clientData.emergency_contact || null,
                    clientData.emergency_phone || null,
                    clientData.notes || null
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn("Client creation failed: No rows affected", { name: clienData.name });
                return {
                    success: false,
                    code: 500,
                    message: "Failed to create client",
                    data: null
                };
            }

            logger.info("Client created successfully", {
                clientId: clientData.id,
                name: clientData.name
            });

            return {
                success: true,
                code: 201,
                message: "Client created successfully",
                data: {
                    id: clientData.id,
                    name: clientData.name
                }
            };
        } catch (error) {
            if (error.message?.includes("UNIQUE constraint failed")) {
                logger.warn("Client creation failed: Duplicate DNI", { dni: clientData.dni });
                return {
                    success: false,
                    code: 409,
                    message: "A client with this DNI already exists",
                    data: null
                };
            }

            logger.error("Error creating client", { error: error.message, name: clientData.name });
            return {
                success: false,
                code: 500,
                message: "Internal server error while creating client",
                data: null
            };
        }
    }
};