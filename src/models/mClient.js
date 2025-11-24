import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mClient = {
    async getClients(filterParams) {
        try {
            const {
                page = 1,
                limit = 10,
                status = true,
                from_date,
                to_date
            } = filterParams;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            let query = `
                SELECT id, dni, name, phone, email, active, COUNT(*) OVER() as total_count
                FROM clients
                WHERE 1=1
            `;

            const args = [];

            if (status !== undefined && status !== null && status !== '') {
                console.log('Filtering by status:', status);
                query += ` AND active = ?`;
                args.push(status);
            }

            if (from_date) {
                console.log('Filtering by from_date:', from_date);
                query += ` AND DATE(created_at) >= ?`;
                args.push(from_date);
            }

            if (to_date) {
                console.log('Filtering by to_date:', to_date);
                query += ` AND DATE(created_at) <= ?`;
                args.push(to_date);
            }

            query += `
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
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
                    message: 'No clients found',
                    data: null
                };
            }

            const total = result.rows[0].total_count || 0;
            const clients = result.rows.map(({ total_count, ...client }) => client);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Clients retrieved successfully',
                data: {
                    clients,
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
            logger.error('Error retrieving clients:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async searchClients(searchTerm, page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const query = `
                SELECT id, dni, name, phone, email, active, COUNT(*) OVER() as total_count
                FROM clients
                WHERE name LIKE ? OR dni LIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;

            const searchPattern = `%${searchTerm}%`;

            const result = await turso.execute({
                sql: query,
                args: [searchPattern, searchPattern, limitNum, offset]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No clients found matching the search criteria',
                    data: null
                };
            }

            const total = result.rows[0].total_count || 0;
            const clients = result.rows.map(({ total_count, ...client }) => client);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Clients retrieved successfully',
                data: {
                    clients,
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
            logger.error('Error searching clients:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getClientFullProfile(clientId) {
        try {
            const clientQuery = `
                SELECT
                    id, dni, name, phone, email, address,
                    emergency_contact, emergency_phone, 
                    notes, active, created_at, updated_at 
                FROM clients
                WHERE id = ?
            `;

            const petsQuery = `
                SELECT
                    p.id, 
                    p.name, 
                    p.breed, 
                    p.sex, 
                    p.weight, 
                    p.birth_date,
                    p.photo_url,       
                    p.photo_public_id,                    
                    s.name as species_name,
                    p.deceased
                FROM pets p
                LEFT JOIN species s ON p.species_id = s.id
                WHERE p.client_id = ? AND p.active = 1
                ORDER BY p.deceased ASC, p.name ASC;
            `;

            const debtQuery = `
                SELECT COALESCE(SUM(balance), 0) as total_debt
                FROM accounts_receivable
                WHERE client_id = ? AND status != 'PAGADO';
            `;

            const [clientResult, petsResult, debtResult] = await Promise.all([
                turso.execute({ sql: clientQuery, args: [clientId] }),
                turso.execute({ sql: petsQuery, args: [clientId] }),
                turso.execute({ sql: debtQuery, args: [clientId] })
            ]);

            if (clientResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Cliente no encontrado',
                    data: null
                };
            }

            const clientData = clientResult.rows[0];
            const totalDebt = Number(debtResult.rows[0].total_debt);
            const financialStatus = totalDebt > 0 ? 'DEUDOR' : 'AL_DIA';

            const fullProfile = {
                ...clientData,
                financial_summary: {
                    status: financialStatus,
                    total_debt: totalDebt,
                    currency: 'USD'
                },
                pets: petsResult.rows
            };

            return {
                success: true,
                code: 200,
                message: 'Perfil del cliente obtenido exitosamente',
                data: fullProfile
            };
        } catch (error) {
            logger.error('Error obtaining full client profile:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async createClient(clientData) {
        try {
            const query = `
                INSERT INTO clients(
                    id, dni, name, phone, email, 
                    address, notes, active, 
                    emergency_contact, emergency_phone
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    clientData.id,
                    clientData.dni,
                    clientData.name,
                    clientData.phone,
                    clientData.email,
                    clientData.address,
                    clientData.notes || null,
                    clientData.active || true,
                    clientData.emergency_contact || null,
                    clientData.emergency_phone || null
                ]
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create client',
                    data: null
                };
            }

            logger.info('Client created successfully', { clientId: clientData.id });

            return {
                success: true,
                code: 201,
                message: 'Client created successfully',
                data: { id: clientData.id }
            };
        } catch (error) {
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                let message = 'The record already exists.';
                if (error.message.includes('clients.dni')) {
                    message = `The DNI/ID ${clientData.dni} is already registered.`;
                } else if (error.message.includes('clients.email')) {
                    message = `The email ${clientData.email} is already registered.`;
                } else if (error.message.includes('clients.phone')) {
                    message = `The phone number ${clientData.phone} is already registered.`;
                }

                logger.warn('Duplicate entry attempt', { dni: clientData.dni });

                return {
                    success: false,
                    code: 409,
                    message: message,
                    data: null
                };
            }

            logger.error('Error creating client in DB', { error });
            return {
                success: false,
                code: 500,
                message: 'Database error while creating client',
                data: null
            };
        }
    },

    async updateClient(clientId, updateData) {
        try {
            const fields = [];
            const values = [];

            Object.keys(updateData).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No fields to update',
                    data: null
                };
            }

            values.push(clientId);

            const query = `
                UPDATE clients
                SET ${fields.join(', ')}, updated_at = datetime('now', '-5 hours')
                WHERE id = ?
            `;

            const result = await turso.execute({
                sql: query,
                args: values
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Client not found or no changes made',
                    data: null
                };
            }

            logger.info('Client updated successfully', { clientId: clientId });

            return {
                success: true,
                code: 200,
                message: 'Client updated successfully',
                data: null
            };
        } catch (error) {
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                let msg = 'Duplicate data (DNI or Email already exist for another customer)';
                return {
                    success: false,
                    code: 409,
                    message: msg,
                    data: null
                };
            }

            logger.error('Error updating client', error);
            return {
                success: false,
                code: 500,
                message: 'Database error while updating',
                data: null
            };
        }
    },

    async getClientAccountStatus(clientId) {
        try {

            const clientCheckQuery = `
                SELECT name 
                FROM clients 
                WHERE id = ?
            `;

            const clientCheck = await turso.execute({
                sql: clientCheckQuery,
                args: [clientId]
            });

            if (clientCheck.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Client not found',
                    data: null
                };
            }

            const clientName = clientCheck.rows[0].name;

            const query = `
                SELECT 
                    ar.id,
                    ar.sale_id,
                    ar.amount as original_amount, -- Monto original de la deuda
                    ar.amount_paid,               -- Cuánto ha pagado
                    ar.balance,                   -- Cuánto debe todavía
                    ar.due_date,                  -- Fecha de vencimiento
                    ar.status,                    -- PENDIENTE, VENCIDO, PAGADO
                    ar.created_at,
                    s.status as sale_status       -- Estado de la venta original
                FROM accounts_receivable ar
                LEFT JOIN sales s ON ar.sale_id = s.id
                WHERE ar.client_id = ?
                ORDER BY 
                    CASE WHEN ar.status != 'PAGADO' THEN 0 ELSE 1 END,
                    ar.due_date ASC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [clientId]
            });

            let totalDebt = 0;
            let totalPaid = 0;

            const movements = result.rows.map(row => {
                if (row.status !== 'PAGADO') {
                    totalDebt += row.balance;
                }
                totalPaid += row.amount_paid;

                return {
                    id: row.id,
                    sale_id: row.sale_id,
                    date: row.created_at,
                    concept: row.sale_id ? 'Venta / Servicio' : 'Cargo Manual',
                    original_amount: row.original_amount,
                    balance: row.balance,
                    due_date: row.due_date,
                    status: row.status,
                    is_overdue: row.status === 'VENCIDO'
                };
            });

            return {
                success: true,
                code: 200,
                message: 'Client account status retrieved successfully',
                data: {
                    client_name: clientName,
                    summary: {
                        total_pending_debt: totalDebt,
                        total_historic_paid: totalPaid,
                        currency: 'USD'
                    },
                    movements: movements
                }
            };
        } catch (error) {
            logger.error('Error obtaining client account status:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async addPetToClient(petData) {
        const tx = await turso.transaction();
        try {
            const insertPetQuery = `
                INSERT INTO pets (
                    id, client_id, name, species_id, breed, sex, 
                    birth_date, color, weight, microchip, sterilized,
                    allergies, special_conditions, photo_url, photo_public_id,
                    active, deceased, deceased_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await tx.execute({
                sql: insertPetQuery,
                args: [
                    petData.id,
                    petData.client_id,
                    petData.name,
                    petData.species_id,
                    petData.breed,
                    petData.sex,
                    petData.birth_date,
                    petData.color || null,
                    petData.weight || null,
                    petData.microchip || null,
                    petData.sterilized || null,
                    petData.allergies || null,
                    petData.special_conditions || null,
                    petData.photo_url || null,
                    petData.photo_public_id || null,
                    petData.active !== undefined ? petData.active : true,
                    petData.deceased || false,
                    petData.deceased_date || null
                ]
            });

            if (result.rowsAffected === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to add pet to client',
                    data: null
                };
            }

            if (petData.weight > 0) {
                const insertWeightQuery = `
                    INSERT INTO pet_weight_history (
                        id, pet_id, weight, recorded_at, notes
                    ) VALUES (?, ?, ?, datetime('now', '-5 hours'), 'Peso inicial al registrar');
                `;

                const weightResult = await tx.execute({
                    sql: insertWeightQuery,
                    args: [
                        petData.weight_record_id,
                        petData.id,
                        petData.weight
                    ]
                });

                if (weightResult.rowsAffected === 0) {
                    await tx.rollback();
                    return {
                        success: false,
                        code: 500,
                        message: 'Failed to record initial pet weight',
                        data: null
                    };
                }
            }

            await tx.commit();
            logger.info('Pet added to client successfully', { petId: petData.id, clientId: petData.client_id });

            return {
                success: true,
                code: 201,
                message: 'Pet added to client successfully',
                data: { id: petData.id }
            };
        } catch (error) {
            await tx.rollback();
            logger.error('Error adding pet to client:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async registerFullClient(clientData, petData) {
        const tx = await turso.transaction();
        try {
            const insertClientQuery = `
                INSERT INTO clients (
                    id, dni, name, phone, email, address, notes, active,
                    emergency_contact, emergency_phone
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            `;

            const insertQueryResult = await tx.execute({
                sql: insertClientQuery,
                args: [
                    clientData.id, clientData.dni, clientData.name, clientData.phone,
                    clientData.email, clientData.address, clientData.notes, clientData.active,
                    clientData.emergency_contact || null, clientData.emergency_phone || null
                ]
            });

            console.log('Insert Client Result:', insertQueryResult);

            const clientId = insertQueryResult.rows[0]?.id;

            if (insertQueryResult.rowsAffected === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create client',
                    data: null
                };
            }

            const insertPetQuery = `
                INSERT INTO pets (
                    id, client_id, name, species_id, breed, sex, 
                    birth_date, color, weight, microchip, sterilized,
                    allergies, special_conditions, photo_url, photo_public_id,
                    active, deceased, deceased_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            `;

            const petInsertResult = await tx.execute({
                sql: insertPetQuery,
                args: [
                    petData.id,
                    clientId,
                    petData.name,
                    petData.species_id,
                    petData.breed,
                    petData.sex,
                    petData.birth_date,
                    petData.color || null,
                    petData.weight || null,
                    petData.microchip || null,
                    petData.sterilized || null,
                    petData.allergies || null,
                    petData.special_conditions || null,
                    petData.photo_url || null,
                    petData.photo_public_id || null,
                    petData.active !== undefined ? petData.active : true,
                    petData.deceased || false,
                    petData.deceased_date || null
                ]
            });

            if (petInsertResult.rowsAffected === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to add pet to client',
                    data: null
                };
            }

            const petId = petInsertResult.rows[0]?.id;

            if (petData.weight > 0) {
                const historySql = `
                    INSERT INTO pet_weight_history (id, pet_id, weight, recorded_at, notes)
                    VALUES (?, ?, ?, datetime('now', '-5 hours'), 'Peso inicial (Registro Express)');
                `;
                await tx.execute({
                    sql: historySql,
                    args: [petData.pet_weight_history_id, petId, petData.weight]
                });
            }

            await tx.commit();
            logger.info('Full registration completed', { clientId: clientId, petId: petId });

            return {
                success: true,
                code: 201,
                message: 'Registro express completado exitosamente',
                data: {
                    client_id: clientId,
                    pet_id: petId
                }
            };
        } catch (error) {
            await tx.rollback();
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                let message = 'Duplication error.';
                if (error.message.includes('clients.dni')) message = `The customer's ID already exists.`;
                else if (error.message.includes('clients.email')) message = 'The customer\'s email already exists.';
                else if (error.message.includes('clients.phone')) message = 'The customer\'s phone number already exists.';

                logger.warn('Duplicate entry in registerFullClient', { error });
                return {
                    success: false,
                    code: 409,
                    message,
                    data: null
                };
            }

            logger.error('Error in registerFullClient transaction', error);
            return {
                success: false,
                code: 500,
                message: 'Internal error in express registration',
                data: null
            };
        }
    }
};