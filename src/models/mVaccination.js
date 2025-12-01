import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mVaccination = {
    async getByPetId(petId) {
        try {
            const query = `
                SELECT 
                    v.id, v.vaccine_name, v.batch_number, 
                    v.date_given, v.next_due,
                    v.manufacturer, v.notes,
                    u.name as vet_name,
                    CASE 
                        WHEN v.next_due IS NULL THEN 'N/A'
                        WHEN date(v.next_due) < date('now', '-5 hours') THEN 'VENCIDA'
                        WHEN date(v.next_due) BETWEEN date('now', '-5 hours') AND date('now', '+15 days', '-5 hours') THEN 'PROXIMA'
                        ELSE 'VIGENTE'
                    END as status
                FROM vaccinations v
                LEFT JOIN users u ON v.applied_by = u.id
                WHERE v.pet_id = ?
                ORDER BY v.date_given DESC;
            `;

            const result = await turso.execute({
                sql: query,
                args: [petId]
            });

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "No se encontraron vacunas para la mascota proporcionada.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Vacunas encontradas para la mascota proporcionada.",
                data: result.rows
            }
        } catch (error) {
            logger.error("mVaccinations.getByPetId:", error);
            return {
                success: false,
                code: 500,
                message: "Error al obtener las vacunas de la mascota.",
                data: null
            };
        }
    },

    async create(vaccinationData) {
        try {
            const sql = `
                INSERT INTO vaccinations(
                    id, pet_id, consultation_id, vaccine_name,
                    batch_number, manufacturer, date_given, 
                    next_due, applied_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            await turso.execute({
                sql,
                args: [
                    vaccinationData.id, vaccinationData.pet_id, vaccinationData.consultation_id || null,
                    vaccinationData.vaccine_name, vaccinationData.batch_number || null, vaccinationData.manufacturer || null,
                    vaccinationData.date_given, vaccinationData.next_due || null,
                    vaccinationData.applied_by, vaccinationData.notes || null
                ]
            });

            return {
                success: true,
                code: 201,
                message: "Vacuna creada exitosamente.",
                data: null
            };
        } catch (error) {
            logger.error("mVaccinations.create:", error);
            return {
                success: false,
                code: 500,
                message: "Error al crear la vacuna.",
                data: null
            };
        }
    },

    async getUpcoming(days = 30) {
        try {
            const query = `
                SELECT 
                    v.id, v.vaccine_name, v.next_due,
                    p.id as pet_id, p.name as pet_name,
                    c.id as client_id, c.name as client_name, c.phone as client_phone
                FROM vaccinations v
                JOIN pets p ON v.pet_id = p.id
                JOIN clients c ON p.client_id = c.id
                WHERE 
                    v.next_due IS NOT NULL 
                    AND date(v.next_due) BETWEEN date('now', '-5 hours') AND date('now', '+${days} days', '-5 hours')
                ORDER BY v.next_due ASC;
            `;

            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "No se encontraron vacunas próximas a vencer.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Vacunas próximas a vencer encontradas.",
                data: result.rows
            }
        } catch (error) {
            logger.error("mVaccinations.getUpcoming:", error);
            return {
                success: false,
                code: 500,
                message: "Error al obtener las vacunas próximas a vencer.",
                data: null
            };
        }
    },

    async delete(vaccinationId) {
        try {
            const result = await turso.execute({
                sql: `DELETE FROM vaccinations WHERE id = ?;`,
                args: [vaccinationId]
            });

            if (result.rowsAffected === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "No se encontró la vacuna a eliminar.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Vacuna eliminada exitosamente.",
                data: null
            };
        } catch (error) {
            logger.error("mVaccinations.delete:", error);
            return {
                success: false,
                code: 500,
                message: "Error al eliminar la vacuna.",
                data: null
            };
        }
    }
};