import { sCash } from "../services/sCash.js";
import { logger } from "../utils/logger.js";

export const cCash = {
    async createCash(req, res) {
        try {
            const cashData = req.body;

            logger.debug('Create Cash Register request received', {
                name: cashData?.name,
                status: cashData?.status
            });

            const result = await sCash.createCash(cashData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createCash controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async registerCashShift(req, res) {
        try {
            const {
                id,
                cash_register_id,
                status,
                start_amount,
                expected_amount,
                actual_amount,
                notes
            } = req.body;

            const userId = req.user ? req.user.id : req.body.user_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado o ID de usuario faltante.'
                });
            }

            const shiftPayload = {
                id,
                cash_register_id,
                user_id: userId,
                status,
                start_amount,
                expected_amount,
                actual_amount,
                notes
            };

            const result = await sCash.registerCashShift(shiftPayload);
            return res.status(result.code).json(result);
        } catch (error) {
            console.error('Error in cCash.registerCashShift:', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Error inesperado en el servidor',
                data: null
            });
        }
    },

    async calculateExpectedCashAmount(req, res) {
        try {
            const { cashRegisterId } = req.params;

            logger.debug('Calculate Expected Cash Amount request received', {
                cashRegisterId
            });

            const result = await sCash.calculateExpectedCashAmount(cashRegisterId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in calculateExpectedCashAmount controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getOpenShiftsByUser(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;

            logger.debug('Get Open Shifts By User request received', {
                userId
            });

            const result = await sCash.getOpenShiftsByUser(userId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getOpenShiftsByUser controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getCurrentShiftHeader(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;

            logger.debug('Get Current Shift Header request received', {
                userId
            });

            const result = await sCash.getCurrentShiftHeader(userId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getCurrentShiftHeader controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getCurrentShiftKPIs(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;

            logger.debug('Get Current Shift KPIs request received', {
                userId
            });

            const result = await sCash.getCurrentShiftKPIs(userId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getCurrentShiftKPIs controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getCurrentShiftMovements(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            logger.debug('Get Current Shift Movements request received', {
                userId
            });

            const result = await sCash.getCurrentShiftMovements(userId, page, limit);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getCurrentShiftMovements controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async depositMoney(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;
            const data = req.body;
            data.user_id = userId;

            logger.debug('Deposit Money request received', {
                userId,
                amount: data.amount
            });

            const result = await sCash.depositMoney(data);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in depositMoney controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async withdrawMoney(req, res) {
        try {
            const userId = req.user ? req.user.id : req.body.user_id;
            const data = req.body;
            data.user_id = userId;

            logger.debug('Withdraw Money request received', {
                userId,
                amount: data.amount
            });

            const result = await sCash.withDrawMoney(data);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in withdrawMoney controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getAvailableCashRegisters(req, res) {
        try {
            const result = await sCash.getAvailableCashRegisters();
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getAvailableCashRegisters controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};