import { mVaccination } from "../models/mVaccination.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';

export const sVaccination = {
    async getByPet(petId) {
        try {
            if (!petId) {
                return {
                    success: false,
                    code: 400,
                    message: "El ID de la mascota es obligatorio.",
                    data: null
                };
            }

            const result = await mVaccination.getByPetId(petId);
            return result;
        } catch (error) {
            logger.error("sVaccination.getByPet:", error);
            return {
                success: false,
                code: 500,
                message: "Error al obtener las vacunas de la mascota.",
                data: null
            };
        }
    },

    async create(userId, body) {
        try {
            const { pet_id, vaccine_name, date_given } = body;

            if (!pet_id || !vaccine_name || !date_given) {
                return {
                    success: false,
                    code: 400,
                    message: "Los campos pet_id, vaccine_name y date_given son obligatorios.",
                    data: null
                };
            }

            const data = {
                id: uuidv4(),
                pet_id,
                consultation_id: body.consultation_id,
                vaccine_name: vaccine_name,
                batch_number: body.batch_number,
                manufacturer: body.manufacturer,
                date_given,
                next_due: body.next_due,
                applied_by: userId,
                notes: body.notes || null
            };

            const result = await mVaccination.create(data);
            return result;
        } catch (error) {
            logger.error("sVaccination.create:", error);
            return {
                success: false,
                code: 500,
                message: "Error al crear la vacuna.",
                data: null
            };
        }
    },

    async getUpcomingList(days) {
        try {
            if (!days || isNaN(days) || days <= 0) {
                return {
                    success: false,
                    code: 400,
                    message: "El parámetro days debe ser un número positivo.",
                    data: null
                };
            }

            const result = await mVaccination.getUpcoming(days);
            return result;
        } catch (error) {
            logger.error("sVaccination.getUpcomingList:", error);
            return {
                success: false,
                code: 500,
                message: "Error al obtener la lista de próximas vacunas.",
                data: null
            };
        }
    },

    async delete(vaccinationId) {
        try {
            if (!vaccinationId) {
                return {
                    success: false,
                    code: 400,
                    message: "El ID de la vacuna es obligatorio.",
                    data: null
                };
            }

            const result = await mVaccination.delete(vaccinationId);
            return result;
        } catch (error) {
            logger.error("sVaccination.delete:", error);
            return {
                success: false,
                code: 500,
                message: "Error al eliminar la vacuna.",
                data: null
            };
        }
    }
};

