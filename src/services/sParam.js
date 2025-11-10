import { mParam } from "../models/mParam.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sParam = {
    async createSpecie(specieData) {
        try {
            if (!specieData.name || typeof specieData.name !== 'string' || specieData.name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Specie name is required and must be a non-empty string',
                    data: null
                };
            }

            const newSpecie = {
                id: uuidv4(),
                name: specieData.name.trim(),
                typical_lifespan_years: specieData.typical_lifespan_years || null,
                common_diseases: specieData.common_diseases || null,
            };

            const result = await mParam.createSpecie(newSpecie);

            return result;
        } catch (error) {
            logger.error('Error in createSpecie service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating specie',
                data: null
            };
        }
    }
};