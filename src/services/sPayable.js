import { mPayable } from "../models/mPayable.js";
import { mCash } from "../models/mCash.js";
import { logger } from "../utils/logger.js";

export const sPayable = {

    async getAll(queryParams) {
        try {
            const page = Math.max(1, parseInt(queryParams.page) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));

            const filters = {
                page,
                limit,

                search: queryParams.search ? queryParams.search.trim() : null,
                supplier_name: queryParams.supplier_name ? queryParams.supplier_name.trim() : null,

                status: queryParams.status,
                start_date: queryParams.start_date,
                end_date: queryParams.end_date
            };

            return await mPayable.getAllPayables(filters);

        } catch (error) {
            logger.error('Service error payables', error);
            return { success: false, code: 500, message: 'Error interno', data: null };
        }
    },

    async getDetail(id) {
        try {
            if (!id) return { success: false, code: 400, message: 'ID requerido' };
            return await mPayable.getPayableById(id);
        } catch (error) {
            logger.error('Service error payables', error);
            return { success: false, code: 500, message: 'Error interno', data: null };
        }
    },

    async registerPayment(id, body, userId) {
        try {
            const { amount, payment_method, notes } = body;

            if (!id) return { success: false, code: 400, message: 'ID de la deuda requerido', data: null };

            if (!amount || Number(amount) <= 0) {
                return { success: false, code: 400, message: 'El monto a pagar debe ser mayor a 0', data: null };
            }

            if (!payment_method) {
                return { success: false, code: 400, message: 'El método de pago es obligatorio', data: null };
            }

            let cashShiftId = null;

            const shiftResult = await mCash.getOpenShiftsByUser(userId);
            if (shiftResult.success && shiftResult.data) {
                cashShiftId = shiftResult.data.shift_id;
            }

            if (payment_method === 'EFECTIVO' && !cashShiftId) {
                return {
                    success: false,
                    code: 400,
                    message: 'No puedes pagar en EFECTIVO si no tienes una caja abierta.',
                    data: null
                };
            }

            const paymentData = {
                payable_id: id,
                amount: Number(amount),
                payment_method,
                notes,
                user_id: userId,
                cash_shift_id: cashShiftId
            };

            return await mPayable.registerPayment(paymentData);

        } catch (error) {
            logger.error('Service error registerPayment', error);
            return { success: false, code: 500, message: 'Error interno procesando el pago' };
        }
    },

    async getHistory(id) {
        try {
            if (!id) return { success: false, code: 400, message: 'ID requerido' };
            return await mPayable.getPaymentHistory(id);
        } catch (error) {
            logger.error('Service error payables history', error);
            return { success: false, code: 500, message: 'Error interno', data: null };
        }
    }
};