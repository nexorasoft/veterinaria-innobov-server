import { mConsultation } from "../models/mConsultation.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

export const sConsultation = {
    async getAll(queryParams) {
        try {
            const page = Math.max(1, parseInt(queryParams.page) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));

            const filters = {
                page,
                limit,

                start_date: queryParams.start_date,
                end_date: queryParams.end_date,
                search: queryParams.search ? queryParams.search.trim() : null
            };

            return await mConsultation.getAll(filters);
        } catch (error) {
            logger.error("Error in sConsultation.getAll:", error);
            return { success: false, code: 500, message: "Internal server error", data: null };
        }
    },

    async startConsultation(userId, body) {
        try {
            const { pet_id, reason, weight, temperature, heart_rate, respiratory_rate } = body;

            if (!pet_id || !reason) {
                return {
                    success: false,
                    code: 400,
                    message: 'Mascota y Motivo son obligatorios',
                    data: null
                };
            }

            const data = {
                id: uuidv4(),
                pet_weight_history_id: uuidv4(),
                user_id: userId,
                pet_id,
                symptoms: reason || '',

                weight: Number(weight) || 0,
                temperature: Number(temperature) || 0,
                heart_rate: Number(heart_rate) || 0,
                respiratory_rate: Number(respiratory_rate) || 0,

                diagnosis: '' || null,
                treatment: '' || null,
                observations: '' || null
            }

            return await mConsultation.create(data);
        } catch (error) {
            logger.error("Error in sConsultation.startConsultation:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while starting the consultation.",
                data: null
            };
        }
    },

    async getDetail(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: "Consultation ID is required.",
                    data: null
                };
            }

            return await mConsultation.getById(id);
        } catch (error) {
            logger.error("Error in sConsultation.getDetail:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while retrieving the consultation details.",
                data: null
            };
        }
    },

    async updateConsultation(id, body) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: "Consultation ID is required.",
                    data: null
                };
            }

            const cleanData = {};
            if (body.diagnosis !== undefined) cleanData.diagnosis = body.diagnosis;
            if (body.treatment !== undefined) cleanData.treatment = body.treatment;
            if (body.symptoms !== undefined) cleanData.symptoms = body.symptoms;
            if (body.observations !== undefined) cleanData.observations = body.observations;
            if (body.next_visit !== undefined) cleanData.next_visit = body.next_visit;
            if (body.next_visit_reason !== undefined) cleanData.next_visit_reason = body.next_visit_reason;

            if (body.finalize === true) {
                cleanData.status = 'FINALIZADA';
            }
            return await mConsultation.update(id, cleanData);
        } catch (error) {
            logger.error("Error in sConsultation.updateConsultation:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while updating the consultation.",
                data: null
            };
        }
    },

    async cancelConsultation(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: "Consultation ID is required.",
                    data: null
                };
            }
            return await mConsultation.cancel(id);
        } catch (error) {
            logger.error("Error in sConsultation.cancelConsultation:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while cancelling the consultation.",
                data: null
            };
        }
    },

    async addMediciones(consultationId, body) {
        try {
            const items = body.medicines;
            console.log(body);
            if (!items || !Array.isArray(items) || items.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Se requiere una lista de medicamentos (array)',
                    data: null
                };
            }
            const cleanList = [];
            for (const item of items) {
                if (!item.product_id || !item.dosage) {
                    return {
                        success: false,
                        code: 400,
                        message: 'Todos los medicamentos deben tener product_id y dosage',
                        data: null
                    };
                }

                cleanList.push({
                    id: uuidv4(),
                    consultation_id: consultationId,
                    product_id: item.product_id,
                    dosage: item.dosage,
                    duration: item.duration,
                    frequency: item.frequency,
                    quantity_prescribed: Number(item.quantity_prescribed),
                    administration_route: item.administration_route,
                    instructions: item.instructions
                });
            }
            return await mConsultation.addMedicine(cleanList);
        } catch (error) {
            logger.error("Error in sConsultation.addMediciones:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while adding medicines to the consultation.",
                data: null
            };
        }
    },

    async removeMediciones(consultationId) {
        try {
            if (!consultationId) {
                return {
                    success: false,
                    code: 400,
                    message: "Consultation ID is required.",
                    data: null
                };
            }
            return await mConsultation.removeMedicine(consultationId);
        } catch (error) {
            logger.error("Error in sConsultation.removeMediciones:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while removing medicines from the consultation.",
                data: null
            };
        }
    }
};