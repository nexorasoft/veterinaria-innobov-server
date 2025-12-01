import { mReceivable } from "../models/mReceivable.js";
import { mCash } from "../models/mCash.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';

export const sReceivable = {
    async getReceivables(queryParams) {
        try {
            const pageNum = Math.max(1, parseInt(queryParams.page)) || 1;
            const limitNum = Math.max(1, Math.min(100, parseInt(queryParams.limit))) || 10;


            const filters = {
                page: pageNum,
                limit: limitNum,
                
                search: queryParams.search ? queryParams.search.trim() : null,
                client_name: queryParams.client_name ? queryParams.client_name.trim() : null,

                status: queryParams.status,
                start_date: queryParams.start_date,
                end_date: queryParams.end_date
            };

            const result = await mReceivable.getAllReceivables({ ...filters, page: pageNum, limit: limitNum });
            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving receivables:', error);
            return {
                success: false,
                code: 500,
                message: 'Error retrieving receivables',
                data: null
            }
        }
    },

    async registerPayment(id, body, userId) {
        try {
            const { amount, payment_method, notes } = body;
            if (!amount || amount <= 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid payment amount',
                    data: null
                };
            }

            let cashShiftId = null;

            if (payment_method === 'EFECTIVO' || payment_method === 'TRANSFERENCIA') {
                const shiftResult = await mCash.getOpenShiftsByUser(userId);

                if (!shiftResult.success || !shiftResult.data) {
                    return {
                        success: false,
                        code: 400,
                        message: `You must have an OPEN CASH REGISTER to receive cash payments.`,
                        data: null
                    };
                }
                cashShiftId = shiftResult.data.shift_id;
            }

            const paymentData = {
                cash_movement_id: uuidv4(),
                receivable_id: id,
                amount: Number(amount),
                payment_method,
                notes,
                user_id: userId,
                cash_shift_id: cashShiftId
            }

            console.log('Payment Data:', paymentData);

            const result = await mReceivable.registerPayment(paymentData);
            return result;
        } catch (error) {
            logger.error('Error in service layer while registering payment:', error);
            return {
                success: false,
                code: 500,
                message: 'Error registering payment',
                data: null
            };
        }
    },

    async getHistory(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Receivable ID is required',
                    data: null
                };
            }

            const result = await mReceivable.getPaymentHistory(id);
            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving payment history:', error);
            return {
                success: false,
                code: 500,
                message: 'Error retrieving payment history',
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
                    message: 'Receivable ID is required',
                    data: null
                };
            }

            const result = await mReceivable.getReceivableById(id);
            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving receivable detail:', error);
            return {
                success: false,
                code: 500,
                message: 'Error retrieving receivable detail',
                data: null
            };
        }
    }
};