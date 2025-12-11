import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mConsultation = {
    async getAll(filters) {
        try {
            const { start_date, end_date, search, page, limit } = filters;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const args = [];

            let whereClause = "WHERE c.status != 'ANULADA'";

            if (start_date) {
                whereClause += " AND date(c.created_at) >= date(?)";
                args.push(start_date);
            }

            if (end_date) {
                whereClause += " AND date(c.created_at) <= date(?)";
                args.push(end_date);
            }

            if (search) {
                whereClause += " AND (p.name LIKE ? OR cl.name LIKE ? OR cl.identification LIKE ?)";
                const searchPattern = `%${search}%`;
                args.push(searchPattern, searchPattern, searchPattern);
            }

            const query = `
                SELECT 
                    c.id, c.created_at, c.status,
                    c.diagnosis, c.symptoms,
                    p.name as pet_name,
                    s.name as pet_species,
                    cl.name as client_name,
                    cl.identification as client_dni,
                    u.name as vet_name,
                    COUNT(*) OVER() as total_count
                FROM consultations c
                JOIN pets p ON c.pet_id = p.id
                JOIN species s ON p.species_id = s.id
                JOIN clients cl ON p.client_id = cl.id
                JOIN users u ON c.user_id = u.id
                ${whereClause}
                ORDER BY c.created_at DESC
                LIMIT ? OFFSET ?;
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
                    message: "No consultations found.",
                    data: null
                };
            }

            const total = result.rows[0].total_count;
            const consultations = result.rows.map(({ total_count, ...consultation }) => consultation);
            const totalPages = Math.ceil(total / limitNum);

            return {
                success: true,
                code: 200,
                message: "Consultations retrieved successfully.",
                data: {
                    consultations,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            }
        } catch (error) {
            logger.error("Error in mConsultation.getAll:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while retrieving consultations.",
                data: null
            };
        }
    },

    async create(consultationData) {
        const tx = await turso.transaction();
        try {
            const insertSQL = `
                INSERT INTO consultations (
                    id, pet_id, user_id, 
                    weight, temperature, heart_rate, respiratory_rate,
                    symptoms, diagnosis, treatment, observations,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN_CURSO', datetime('now', '-5 hours'), datetime('now', '-5 hours'));
            `;

            console.log("Creating consultation with data:", consultationData.id);
            console.log("Consultation details:", consultationData.pet_id);
            console.log("Consultation user ID:", consultationData.user_id);
            console.log("Consultation weight:", consultationData.weight);
            console.log("Consultation diagnosis:", consultationData.temperature);
            console.log("Consultation temperature:", consultationData.heart_rate);
            console.log("Consultation respiratory_rate:", consultationData.respiratory_rate);
            console.log("Consultation symptoms:", consultationData.symptoms);
            console.log("Consultation diagnosis:", consultationData.diagnosis);
            console.log("Consultation treatment:", consultationData.treatment);
            console.log("Consultation observations:", consultationData.observations);

            await tx.execute({
                sql: insertSQL,
                args: [
                    consultationData.id, consultationData.pet_id, consultationData.user_id,
                    consultationData.weight, consultationData.temperature, consultationData.heart_rate, consultationData.respiratory_rate,
                    consultationData.symptoms, consultationData.diagnosis, consultationData.treatment, consultationData.observations
                ]
            });

            console.log("Consultation created with pet_weight_history_id:", consultationData.pet_weight_history_id);
            console.log("Consultation pet_id:", consultationData.pet_id);
            console.log("Consultation weight:", consultationData.weight);

            if (consultationData.weight > 0) {
                await tx.execute({
                    sql: `INSERT INTO pet_weight_history (id, pet_id, weight, recorded_at, notes) VALUES (?, ?, ?, datetime('now', '-5 hours'), ?)`,
                    args: [consultationData.pet_weight_history_id, consultationData.pet_id, consultationData.weight, 'Registro desde Consulta']
                });

                await tx.execute({
                    sql: `UPDATE pets SET weight = ? WHERE id = ?`,
                    args: [consultationData.weight, consultationData.pet_id]
                });
            }

            await tx.commit();
            return {
                success: true,
                code: 201,
                message: "Consultation created successfully.",
                data: { id: consultationData.id }
            };
        } catch (error) {
            await tx.rollback();
            logger.error("Error in mConsultation.create:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while creating the consultation.",
                data: null
            };
        }
    },

    async getById(consultationId) {
        try {
            const consultSql = `
                SELECT c.*, 
                       p.name as pet_name, p.birth_date, p.sex, p.breed, p.weight as current_pet_weight,
                       p.photo_url as pet_photo,
                       cl.name as client_name,
                       u.name as vet_name
                FROM consultations c
                JOIN pets p ON c.pet_id = p.id
                JOIN clients cl ON p.client_id = cl.id
                JOIN users u ON c.user_id = u.id
                WHERE c.id = ?;
            `;

            const medicinesSql = `
                SELECT 
                    cm.id, 
                    cm.product_id, 
                    p.name as product_name,
                    p.code as product_code,
                    cm.dosage, 
                    cm.duration, 
                    cm.frequency, 
                    cm.quantity_prescribed, 
                    cm.administration_route, 
                    cm.instructions
                FROM consultation_medicines cm
                JOIN products p ON cm.product_id = p.id
                WHERE cm.consultation_id = ?;
            `;

            const [consultRes, medRes] = await Promise.all([
                turso.execute({ sql: consultSql, args: [consultationId] }),
                turso.execute({ sql: medicinesSql, args: [consultationId] })
            ]);

            if (consultRes.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "Consultation not found.",
                    data: null
                };
            }

            const consultation = consultRes.rows[0];
            const medicines = medRes.rows;

            return {
                success: true,
                code: 200,
                message: "Consultation retrieved successfully.",
                data: {
                    ...consultation,
                    medicines: medicines
                }
            };
        } catch (error) {
            logger.error("Error in mConsultation.getById:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while retrieving the consultation.",
                data: null
            };
        }
    },

    async update(consultationId, updateData) {
        try {
            const fields = [];
            const values = [];

            const allowedFields = [
                'diagnosis', 'treatment', 'symptoms',
                'observations', 'next_visit', 'next_visit_reason',
                'status'
            ];

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: "No valid fields provided for update.",
                    data: null
                };
            }

            values.push(consultationId);

            const sql = `
                UPDATE consultations 
                SET ${fields.join(', ')}, 
                    updated_at = datetime('now', '-5 hours') 
                WHERE id = ?`
                ;

            const result = await turso.execute({ sql, args: values });

            if (result.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "Consultation not found or no changes made.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Consultation updated successfully.",
                data: { id: consultationId }
            };
        } catch (error) {
            logger.error("Error in mConsultation.update:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while updating the consultation.",
                data: null
            };
        }
    },

    async cancel(consultationId) {
        try {
            const sql = `
                UPDATE consultations 
                SET status = 'ANULADA', updated_at = datetime('now', '-5 hours') 
                WHERE id = ?;
            `;

            const result = await turso.execute({ sql, args: [consultationId] });

            if (result.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "Consultation not found or already canceled.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Consultation canceled successfully.",
                data: { id: consultationId }
            };
        } catch (error) {
            logger.error("Error in mConsultation.cancel:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while canceling the consultation.",
                data: null
            };
        }
    },

    async addMedicine(medicinesArray) {
        const tx = await turso.transaction();
        try {
            const sql = `
                INSERT INTO consultation_medicines (
                    id, consultation_id, product_id, 
                    dosage, duration, frequency, 
                    quantity_prescribed, administration_route, instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            for (const med of medicinesArray) {
                await tx.execute({
                    sql,
                    args: [
                        med.id,
                        med.consultation_id,
                        med.product_id,
                        med.dosage,
                        med.duration || null,
                        med.frequency || null,
                        med.quantity_prescribed || 1,
                        med.administration_route || 'Oral',
                        med.instructions || null
                    ]
                });
            }

            await tx.commit();
            return {
                success: true,
                code: 201,
                message: "Medicines added to consultation successfully.",
                data: null
            };
        } catch (error) {
            await tx.rollback();
            logger.error("Error in mConsultation.addMedicine:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while adding medicines to the consultation.",
                data: null
            };
        }
    },

    async removeMedicine(medicineId) {
        try {
            const sql = `
                DELETE FROM consultation_medicines 
                WHERE id = ?;
            `;

            const result = await turso.execute({ sql, args: [medicineId] });

            if (result.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    message: "Medicine not found in consultation.",
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: "Medicine removed from consultation successfully.",
                data: null
            };
        } catch (error) {
            logger.error("Error in mConsultation.removeMedicine:", error);
            return {
                success: false,
                code: 500,
                message: "An error occurred while removing the medicine from the consultation.",
                data: null
            };
        }
    }
}; 