import { mCash } from "../models/mCash.js";
import { logger } from "../utils/logger.js";
import { hSend } from "../helpers/hSend.js";
import { getCurrentDateTime } from "../utils/methods.js";
import { v4 as uuidv4 } from 'uuid';

export const sCash = {
    async createCash(cashData) {
        try {
            const requiredFields = ['name', 'status'];

            const missingFields = requiredFields.filter(field =>
                cashData[field] === undefined || cashData[field] === null
                || (typeof cashData[field] === 'string' && cashData[field].trim() === '')
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const status = ['ABIERTA', 'CERRADA'];
            if (!status.includes(cashData.status)) {
                return {
                    success: false,
                    code: 400,
                    message: `Invalid status. Allowed values are: ${status.join(', ')}`,
                    data: null
                };
            }

            const newCash = {
                id: uuidv4(),
                name: cashData.name.trim(),
                status: cashData.status
            };

            const result = await mCash.createCash(newCash);
            return result;
        } catch (error) {
            logger.error('Error in createCash service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating cash register',
                data: null
            };
        }
    },

    async registerCashShift(req, shiftData) {
        try {
            const requiredFields = ['cash_register_id', 'status', 'user_id'];
            const missingFields = requiredFields.filter(field => !shiftData[field]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Faltan campos requeridos: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const validStatuses = ['ABIERTA', 'CERRADA'];
            if (!validStatuses.includes(shiftData.status)) {
                return {
                    success: false,
                    code: 400,
                    message: 'El estado debe ser ABIERTA o CERRADA',
                    data: null
                };
            }

            const cleanData = {
                cash_register_id: shiftData.cash_register_id,
                user_id: shiftData.user_id,
                status: shiftData.status,
                notes: shiftData.notes || null,
                start_time: null,
                start_amount: 0,
                end_time: null,
                expected_amount: 0,
                actual_amount: 0,
                difference: 0
            };

            if (shiftData.status === 'ABIERTA') {
                cleanData.id = uuidv4();

                if (shiftData.start_amount === undefined || shiftData.start_amount < 0) {
                    return {
                        success: false,
                        code: 400,
                        message: 'Start amount is required and must be non-negative for opening a shift',
                        data: null
                    };
                }

                cleanData.start_time = getCurrentDateTime();
                cleanData.start_amount = Number(shiftData.start_amount);
            }

            else if (shiftData.status === 'CERRADA') {
                if (!shiftData.id) {
                    return {
                        success: false,
                        code: 400,
                        message: 'Shift ID is required to close a shift',
                        data: null
                    };
                }

                cleanData.id = shiftData.id;

                if (shiftData.actual_amount === undefined || shiftData.expected_amount === undefined) {
                    return {
                        success: false,
                        code: 400,
                        message: 'Closing amounts are required',
                        data: null
                    };
                }

                cleanData.end_time = getCurrentDateTime();
                cleanData.expected_amount = Number(shiftData.expected_amount);
                cleanData.actual_amount = Number(shiftData.actual_amount);
                cleanData.difference = cleanData.actual_amount - cleanData.expected_amount;
            }

            const result = await mCash.registerCashShift(cleanData);

            hSend.cashRegistrNotification(req, cleanData).catch(err => {
                console.error('Alerta: El turno se guardó, pero el correo falló:', err);
            });

            return result;
        } catch (error) {
            logger.error('Error in registerCashShift service', error);
            return {
                success: false,
                code: 500,
                message: 'Error interno procesando el turno de caja',
                data: null
            };
        }
    },

    async calculateExpectedCashAmount(cashRegisterId) {
        try {
            if (!cashRegisterId) {
                return {
                    success: false,
                    code: 400,
                    message: 'cashRegisterId is required',
                    data: null
                };
            }

            const result = await mCash.calculateExpectedCashAmount(cashRegisterId);
            return result;
        } catch (error) {
            logger.error('Error in calculateExpectedCashAmount service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while calculating expected cash amount',
                data: null
            };
        }
    },

    async getOpenShiftsByUser(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'userId is required',
                    data: null
                };
            }

            const result = await mCash.getOpenShiftsByUser(userId);
            return result;
        } catch (error) {
            logger.error('Error in getOpenShiftsByUser service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving open shifts',
                data: null
            };
        }
    },

    async getCurrentShiftHeader(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'userId is required',
                    data: null
                };
            }

            const result = await mCash.getCurrentShiftHeader(userId);
            return result;
        } catch (error) {
            logger.error('Error in getCurrentShiftHeader service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving current shift header',
                data: null
            };
        }
    },

    async getCurrentShiftKPIs(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'userId is required',
                    data: null
                };
            }

            const result = await mCash.getCurrentShiftKPIs(userId);
            return result;
        } catch (error) {
            logger.error('Error in getCurrentShiftKPIs service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving current shift KPIs',
                data: null
            };
        }
    },

    async getCurrentShiftMovements(userId, page, limit) {
        try {
            if (!userId) {
                return {
                    success: false,
                    code: 400,
                    message: 'userId is required',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));


            const result = await mCash.getCurrentShiftMovements(userId, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getCurrentShiftMovements service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving current shift movements',
                data: null
            };
        }
    },

    async depositMoney(data) {
        try {
            const requiredFields = ['type', 'category', 'amount'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const types = ['INGRESO'];
            if (!types.includes(data.type)) {
                return {
                    success: false,
                    code: 400,
                    message: `Invalid type. Allowed values are: ${types.join(', ')}`,
                    data: null
                };
            }

            const categories = ['PAGO_SERVICIO', 'PAGO_SALARIO', 'GASTO_OPERATIVO', 'OTRO'];
            if (!categories.includes(data.category)) {
                return {
                    success: false,
                    code: 400,
                    message: `Invalid category. Allowed values are: ${categories.join(', ')}`,
                    data: null
                };
            }

            let id = uuidv4();
            const movementData = {
                id: id,
                user_id: data.user_id,
                type: data.type,
                category: data.category,
                concept: `Movimiento de caja - ${data.type}/${data.category} #${id}`,
                amount: Number(data.amount),
                notes: data.notes || null
            };

            const result = await mCash.registerManualMovement(movementData);
            return result;
        } catch (error) {
            logger.error('Error in depositMoney service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while processing monetary deposit',
                data: null
            }; i
        }
    },

    async withDrawMoney(data) {
        try {
            const requiredFields = ['type', 'category', 'amount'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const types = ['EGRESO'];
            if (!types.includes(data.type)) {
                return {
                    success: false,
                    code: 400,
                    message: `Invalid type. Allowed values are: ${types.join(', ')}`,
                    data: null
                };
            }

            const categories = ['PAGO_SERVICIO', 'PAGO_SALARIO', 'GASTO_OPERATIVO', 'OTRO'];
            if (!categories.includes(data.category)) {
                return {
                    success: false,
                    code: 400,
                    message: `Invalid category. Allowed values are: ${categories.join(', ')}`,
                    data: null
                };
            }

            let id = uuidv4();
            const movementData = {
                id: id,
                user_id: data.user_id,
                type: data.type,
                category: data.category,
                concept: `Movimiento de caja - ${data.type}/${data.category} #${id}`,
                amount: Number(data.amount),
                notes: data.notes || null
            };

            const result = await mCash.registerManualMovement(movementData);
            return result;
        } catch (error) {
            logger.error('Error in withDrawMoney service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while processing monetary withdrawal',
                data: null
            };
        }
    },

    async getAvailableCashRegisters() {
        try {
            const result = await mCash.getAvailableCashRegisters();
            return result;
        } catch (error) {
            logger.error('Error in getAvailableCashRegisters service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while fetching available cash registers',
                data: null
            };
        }
    }
}