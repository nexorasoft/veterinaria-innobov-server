import { v4 as uuidv4 } from 'uuid';
import { mPurchase } from "../models/mPurchase.js";
import { hPurchase } from '../helpers/hPurchase.js';
import { mCash } from "../models/mCash.js";
import { logger } from "../utils/logger.js";

export const sPurchase = {
    async createPurchase(purchaseData, userId) {
        try {
            const validation = hPurchase.validatePurchaseData(purchaseData);
            if (!validation.valid) {
                return { success: false, code: 400, message: validation.error };
            }

            const {
                supplier_id,
                items,
                payment_method = 'EFECTIVO',
                status = 'PENDIENTE',
                discount = 0,
                notes,
                due_date
            } = purchaseData;

            const supplier = await mPurchase.getSupplierById(supplier_id);
            if (!supplier) {
                return { success: false, code: 404, message: 'Proveedor no encontrado o inactivo' };
            }

            let cashShiftId = null;

            if (payment_method === 'EFECTIVO' && status === 'PAGADA') {
                const shiftResult = await mCash.getOpenShiftsByUser(userId);

                if (!shiftResult.success || !shiftResult.data) {
                    return {
                        success: false,
                        code: 400,
                        message: 'Error: Para pagar en EFECTIVO necesitas tener una caja abierta.'
                    };
                }
                cashShiftId = shiftResult.data.shift_id;
            }

            const { validatedItems, newProducts } = await hPurchase.validateAndEnrichItems(items, supplier_id);

            const { subtotal, tax, total } = hPurchase.calculateTotals(validatedItems, discount);

            const purchaseId = uuidv4();
            const transactionData = {
                purchaseId,
                supplier_id,
                user_id: userId,
                subtotal,
                tax,
                discount,
                total,
                payment_method,
                status,
                due_date: due_date || null,
                notes: notes || null,
                validatedItems,
                newProducts,
                supplierName: supplier.name,

                cashMovementId: uuidv4(),
                accountPayableId: uuidv4(),
                auditLogId: uuidv4(),

                cashShiftId: cashShiftId
            };

            const result = await mPurchase.createPurchaseTransaction(transactionData);

            if (result.success) {
                hPurchase.createNotifications(validatedItems).catch(err =>
                    logger.error('Error background notifications', err)
                );
            }

            return result;

        } catch (error) {
            logger.error('Error al crear compra en service:', error);
            return {
                success: false,
                code: 500,
                message: 'Error al registrar compra',
                error: error.message
            };
        }
    },

    async getPurchases(filterParams) {
        try {
            const {
                status,
                supplier_id,
                from_date,
                to_date,
                today,
                page = 1,
                limit = 10
            } = filterParams;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mPurchase.getPurchases({
                status,
                supplier_id,
                from_date,
                to_date,
                today,
                page: pageNum,
                limit: limitNum
            });

            return result;
        } catch (error) {
            logger.error('Error al obtener compras en service:', error);
            return {
                success: false,
                code: 500,
                message: 'Error al obtener compras',
                error: error.message
            };
        }
    },

    async getDetailsPurchaseById(purchaseId) {
        try {
            if (!purchaseId || typeof purchaseId !== 'string' || purchaseId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid purchase ID',
                    data: null
                };
            }
            const result = await mPurchase.getDetailsPurchaseById(purchaseId);
            return result;
        } catch (error) {
            logger.error('Error al obtener detalles de compra en service:', error);
            return {
                success: false,
                code: 500,
                message: 'Error al obtener detalles de compra',
                error: error.message
            };
        }
    }
};