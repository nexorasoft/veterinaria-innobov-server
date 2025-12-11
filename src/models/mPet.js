import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mPet = {
    async getAllPets(filters) {
        try {
            const { search, page = 1, limit = 10 } = filters;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const args = [];
            const conditions = [];

            // Filtro de búsqueda
            if (search) {
                conditions.push(`(
                p.name LIKE '%' || ? || '%' OR
                p.microchip LIKE '%' || ? || '%' OR
                c.name LIKE '%' || ? || '%' OR
                c.identification LIKE '%' || ? || '%'
            )`);
                args.push(search, search, search, search);
            }

            // Construir WHERE clause
            const whereClause = conditions.length > 0
                ? "WHERE " + conditions.join(" AND ")
                : "";

            const query = `
            SELECT 
                p.id, p.name, s.name as species_name, 
                c.name as owner_name, c.identification as owner_dni,
                p.birth_date, p.sex,
                COUNT(*) OVER() as total_count, p.active
            FROM pets p
            JOIN clients c ON p.client_id = c.id
            LEFT JOIN species s ON p.species_id = s.id
            ${whereClause}
            ORDER BY p.name DESC
            LIMIT ? OFFSET ?
        `;

            console.log('Executing query:', query);
            console.log('With args:', args.concat([limitNum, offset]));

            args.push(limitNum, offset);

            const result = await turso.execute({
                sql: query,
                args: args
            });

            if (result.rows.length === 0) {
                return {
                    success: true,
                    code: 200,
                    message: 'No pets found',
                    data: {
                        pets: [],
                        pagination: {
                            currentPage: pageNum,
                            totalPages: 0,
                            totalItems: 0,
                            itemsPerPage: limitNum,
                            hasNextPage: false,
                            hasPreviousPage: false
                        }
                    }
                };
            }

            const total = result.rows[0].total_count || 0;
            const pets = result.rows.map(({ total_count, ...pet }) => pet);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Pets retrieved successfully',
                data: {
                    pets,
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
            logger.error('Error retrieving pets:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },
    async getPetProfile(petId) {
        try {
            const query = `
                SELECT 
                    p.*, 
                    s.name as species_name,
                    c.id as owner_id, 
                    c.name as owner_name,
                    c.phone as owner_phone,
                    c.address as owner_address,
                    c.identification as owner_dni
                FROM pets p
                JOIN clients c ON p.client_id = c.id
                LEFT JOIN species s ON p.species_id = s.id
                WHERE p.id = ? AND p.active = 1
            `;

            const result = await turso.execute({
                sql: query,
                args: [petId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Pet not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Pet profile retrieved successfully',
                data: result.rows[0]
            }
        } catch (error) {
            logger.error('Error retrieving pet profile:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async updatePet(petId, petData) {
        try {
            console.log('Updating pet with ID:', petId, 'with data:', petData);
            const fields = [];
            const values = [];

            Object.keys(petData).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(petData[key]);
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No fields to update',
                    data: null
                };
            }

            values.push(petId);

            const query = `
                UPDATE pets 
                SET ${fields.join(', ')}, updated_at = datetime('now', '-5 hours')
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: values
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'Pet not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Pet updated successfully',
                data: {
                    pet_id: petId
                }
            };
        } catch (error) {
            logger.error('Error updating pet:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getByIdForService(petId) {
        try {
            const query = `
                SELECT * FROM pets
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [petId]
            });

            if (result.rows.length === 0) {
                return null
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error retrieving pet by ID for service:', error);
            return null;
        }
    },

    async addWeightRecord(petData) {
        const tx = await turso.transaction();
        try {
            const insertHistorySql = `
                INSERT INTO pet_weight_history (
                    id, pet_id, weight, notes, 
                    recorded_at, recorded_by
                ) VALUES (?, ?, ?, ?, datetime('now', '-5 hours'), ?);
            `;

            await tx.execute({
                sql: insertHistorySql,
                args: [
                    petData.id,
                    petData.pet_id,
                    petData.weight,
                    petData.notes || null,
                    petData.recorded_by || null
                ]
            });

            const updatePetSql = `UPDATE pets SET weight = ? WHERE id = ?`;
            await tx.execute({
                sql: updatePetSql,
                args: [petData.weight, petData.pet_id]
            });

            await tx.commit();
            return {
                success: true,
                code: 201,
                message: 'Weight record added successfully',
                data: {
                    pet_id: petData.pet_id,
                    weight: petData.weight
                }
            };
        } catch (error) {
            await tx.rollback();
            logger.error('Error adding weight record:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getWeightHistory(petId) {
        try {
            const query = `
                SELECT 
                    id, 
                    weight, 
                    notes, 
                    date(recorded_at) as date_only,
                    recorded_at as full_date
                FROM pet_weight_history
                WHERE pet_id = ?
                ORDER BY recorded_at DESC;
            `;

            const result = await turso.execute({ sql: query, args: [petId] });

            return {
                success: true,
                code: 200,
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching weight history', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async deleteWeightRecord(weightId, petId) {
        const tx = await turso.transaction();
        try {
            const deleteSql = `DELETE FROM pet_weight_history WHERE id = ?`;
            const deleteResult = await tx.execute({ sql: deleteSql, args: [weightId] });

            if (deleteResult.rowsAffected === 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 404,
                    message: 'Weight record not found',
                    data: null
                };
            }

            const findLatestSql = `
                SELECT weight FROM pet_weight_history 
                WHERE pet_id = ? 
                ORDER BY recorded_at DESC 
                LIMIT 1;
            `;

            const latestResult = await tx.execute({ sql: findLatestSql, args: [petId] });

            let newCurrentWeight = 0;
            if (latestResult.rows.length > 0) {
                newCurrentWeight = latestResult.rows[0].weight;
            }

            const updatePetSql = `UPDATE pets SET weight = ? WHERE id = ?`;
            await tx.execute({ sql: updatePetSql, args: [newCurrentWeight, petId] });

            await tx.commit();

            return {
                success: true,
                code: 200,
                message: 'Registro eliminado y peso actual recalculado',
                data: { new_current_weight: newCurrentWeight }
            };

        } catch (error) {
            await tx.rollback();
            logger.error('Error deleting weight record', error);
            return { success: false, code: 500, message: 'Error al eliminar registro' };
        }
    }
}