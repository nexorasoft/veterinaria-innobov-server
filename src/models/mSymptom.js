import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mSymptom = {
    async createSymptom(symptomData) {
        try {
            const query = `
                INSERT INTO symptoms(
                    id, name, description, severity
                ) VALUES (?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    symptomData.id,
                    symptomData.name,
                    symptomData.description || null,
                    symptomData.severity || 'MODERADO'
                ]
            })

            if (result.rowsAffected === 0) {
                logger.warn('Symptom creation failed: No rows affected', { name: symptomData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create symptom',
                    data: null
                };
            }

            logger.info('Symptom created successfully', { id: symptomData.id });
            return {
                success: true,
                code: 201,
                message: 'Symptom created successfully',
                data: {
                    id: symptomData.id
                }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Symptom creation failed: Duplicate name', { name: symptomData.name });
                return {
                    success: false,
                    code: 409,
                    message: 'A symptom with this name already exists',
                    data: null
                };
            }

            logger.error('Error creating symptom', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while creating the symptom',
                data: null
            };
        }
    },

    async associateSymptomWithMedicine(associateData) {
        try {
            const symptoms = Array.isArray(associateData.symptoms)
                ? associateData.symptoms
                : [associateData.symptoms];

            if (symptoms.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No symptoms provided',
                    data: null
                };
            }

            const placeholders = symptoms.map(() => '(?, ?, ?, ?)').join(', ');
            const query = `
            INSERT INTO medicine_symptom(
                medicine_id, symptom_id, effectiveness, notes
            ) VALUES ${placeholders}
        `;

            const args = symptoms.flatMap(symptom => [
                associateData.medicine_id,
                symptom.symptom_id,
                symptom.effectiveness,
                symptom.notes || null
            ]);

            const result = await turso.execute({ sql: query, args });

            if (result.rowsAffected === 0) {
                logger.warn('Medicine-Symptom associations failed', {
                    medicine_id: associateData.medicine_id
                });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to associate symptoms with medicine',
                    data: null
                };
            }

            logger.info('Symptoms associated successfully', {
                medicine_id: associateData.medicine_id,
                count: result.rowsAffected
            });

            return {
                success: true,
                code: 201,
                message: `${result.rowsAffected} symptoms associated successfully`,
                data: { associated: result.rowsAffected }
            };

        } catch (error) {
            logger.error('Error associating symptoms with medicine', error);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while associating symptoms with medicine',
                data: null
            };
        }
    },

    async searchMedicinesBySymptoms(symptomNames) {
        try {
            if (!Array.isArray(symptomNames) || symptomNames.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No symptom names provided for search',
                    data: null
                };
            }

            const normalizedSymptoms = symptomNames.map(name =>
                name.trim().toLowerCase()
            );

            const placeholders = normalizedSymptoms.map(() => '?').join(', ');

            logger.debug('Searching symptoms (case-insensitive)', {
                original: symptomNames,
                normalized: normalizedSymptoms
            });

            const symptomsQuery = `
                SELECT id, name, severity
                FROM symptoms
                WHERE LOWER(TRIM(name)) IN (${placeholders})
            `;

            const symptomResult = await turso.execute({
                sql: symptomsQuery,
                args: normalizedSymptoms
            });

            logger.debug('Symptom search result', {
                found: symptomResult.rows?.length || 0
            });

            const searchedSymptoms = symptomResult.rows || [];
            if (searchedSymptoms.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No matching symptoms found',
                    data: null
                };
            }

            const symptomIds = searchedSymptoms.map(s => s.id);

            const medsPlaceholders = symptomIds.map(() => '?').join(', ');
            const medicinesQuery = `
                SELECT
                    m.id AS medicine_id,
                    m.name AS medicine_name,
                    m.active_ingredient,
                    m.sale_price,
                    m.stock,
                    s.id AS symptom_id,
                    s.name AS symptom_name,
                    ms.effectiveness,
                    ms.notes
                FROM medicine_symptom ms
                JOIN products m ON m.id = ms.medicine_id
                JOIN symptoms s ON s.id = ms.symptom_id
                WHERE s.id IN (${medsPlaceholders})
            `;

            const medResult = await turso.execute({
                sql: medicinesQuery,
                args: symptomIds
            });

            if (!medResult.rows || medResult.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No medicines found for the given symptoms',
                    data: null
                };
            }

            const medicineMap = new Map();

            for (const row of medResult.rows) {
                if (!medicineMap.has(row.medicine_id)) {
                    medicineMap.set(row.medicine_id, {
                        id: row.medicine_id,
                        name: row.medicine_name,
                        active_ingredient: row.active_ingredient,
                        sale_price: row.sale_price,
                        stock: row.stock,
                        symptom_details: [],
                        relevance_score: 0,
                        matching_symptoms_count: 0
                    });
                }

                const med = medicineMap.get(row.medicine_id);

                let score = 0;
                switch (row.effectiveness?.toUpperCase()) {
                    case 'ALTA': score = 3; break;
                    case 'MEDIA': score = 2; break;
                    case 'BAJA': score = 1; break;
                }

                med.symptom_details.push({
                    id: row.symptom_id,
                    name: row.symptom_name,
                    effectiveness: row.effectiveness,
                    notes: row.notes
                });

                med.relevance_score += score;
                med.matching_symptoms_count += 1;
            }

            const medicines = Array.from(medicineMap.values()).map(med => {
                med.treated_symptoms = med.symptom_details.map(s => s.name).join(', ');

                if (med.relevance_score >= 7) {
                    med.recommendation_level = 'RECOMENDADO';
                } else if (med.relevance_score >= 3) {
                    med.recommendation_level = 'PODRIA_AYUDAR';
                } else {
                    med.recommendation_level = 'BAJA_RELEVANCIA';
                }

                return med;
            });

            medicines.sort((a, b) => b.relevance_score - a.relevance_score);

            logger.info('Symptom search completed', {
                searched_count: searchedSymptoms.length,
                medicines_found: medicines.length
            });

            return {
                success: true,
                code: 200,
                message: 'Intelligent symptom search completed successfully',
                data: {
                    searched_symptoms: searchedSymptoms,
                    total_results: searchedSymptoms.length,
                    medicines
                }
            };

        } catch (error) {
            logger.error('Error in intelligent symptom search', error);
            return {
                success: false,
                code: 500,
                message: 'Error performing intelligent symptom search',
                data: null
            };
        }
    },

    async searchSymptomsByName(nameFragment) {
        try {
            const query = `
                SELECT
                    id,
                    name
                FROM 
                    symptoms
                WHERE 
                    name LIKE '%' || ? || '%'
                ORDER BY 
                    name ASC
                LIMIT 5;
            `;

            const result = await turso.execute({
                sql: query,
                args: [nameFragment]
            });

            if (!result.rows || result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No symptoms found matching the name fragment',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Symptom search by name completed successfully',
                data: result.rows || []
            };
        } catch (error) {
            logger.error('Error in searchSymptomsByName', error);
            return {
                success: false,
                code: 500,
                message: 'Error performing symptom search by name',
                data: null
            };
        }
    },
};