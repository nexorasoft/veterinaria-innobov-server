import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mParam = {
    async createSpecie(specieData) {
        try {
            const query = `
                INSERT INTO species(
                    id, name, typical_lifespan_years, common_diseases
                ) VALUES (?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    specieData.id,
                    specieData.name,
                    specieData.typical_lifespan_years,
                    specieData.common_diseases,
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Specie creation failed: No rows affected', { name: specieData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create specie',
                    data: null
                };
            }

            logger.info('Specie created successfully', {
                specieId: specieData.id,
                name: specieData.name
            });

            return {
                success: true,
                code: 201,
                message: 'Specie created successfully',
                data: { 
                    id: specieData.id,
                    name: specieData.name
                }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Specie creation failed: Duplicate name', { name: specieData.name });
                return {
                    success: false,
                    code: 409,
                    message: 'A specie with this name already exists',
                    data: null
                };
            }

            logger.error('Error creating specie', { error: error.message, name: specieData.name });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating specie',
                data: null
            };
        }
    },
};