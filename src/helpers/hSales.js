import { RUC_DNI_API_URL } from "../config/env.js";
import axios from "axios";
import { logger } from "../utils/logger.js";
import { mSend } from "../models/mSend.js";
import { mProduct } from "../models/mProduct.js";
import { sNotification } from "../services/sNotification.js";
import { uSRI } from "../utils/sri.js";

export const hSales = {
    async getPersonByIdentification(identification) {
        try {
            const id = identification.trim();

            if (!/^\d+$/.test(id)) {
                return {
                    success: false,
                    code: 400,
                    message: 'Identification must contain only digits.',
                    data: null
                };
            }

            if (id.length === 10) {
                const person = await uSRI.fetchPersonByCedula(id);
                return person;
            }

            if (id.length === 13) {
                const taxpayer = await uSRI.fetchTaxpayerInfo(id);
                const simplifiedTaxpayer = {
                    names: taxpayer.razonSocial,
                    identification: taxpayer.numeroRuc,
                };

                return simplifiedTaxpayer;
            }

            return null;

        } catch (error) {
            logger.error('hSales.getPersonByIdentification: ' + error.message);
            return null
        }
    },

    async checkStockAndNotify(items) {
        try {
            const products = items.filter(i => i.item_type === 'PRODUCTO' && i.product_id);

            if (products.length === 0) return;

            const recipients = await mSend.getIdsByRoles(['admin', 'cashier']);

            if (!recipients || recipients.length === 0) return;

            for (const item of products) {
                const result = await mProduct.getProductDetailsById(item.product_id);

                if (!result || !result.success || !result.data) continue;

                const productInfo = result.data;
                const currentStock = productInfo.stock.current;
                const minStock = productInfo.stock.min;

                if (currentStock <= minStock) {
                    const notificationData = {
                        title: '⚠️ Stock Bajo',
                        message: `El producto "${productInfo.name}" se está agotando. Stock actual: ${currentStock} (Mín: ${minStock})`,
                        type: 'STOCK',
                        priority: 'ALTA',
                        related_entity_type: 'product',
                        related_entity_id: item.product_id
                    };

                    const promises = recipients.map(userId =>
                        sNotification.create(userId, notificationData)
                    );

                    await Promise.all(promises);
                }
            }
        } catch (error) {
            logger.error('Error in checkStockAndNotify:', error);
            throw error;
        }
    },

    inferSriCode(identification) {
        if (!identification) return '07';

        const cleanId = identification.trim();

        if (cleanId === '9999999999999') return '07';
        if (cleanId.length === 13) return '04';
        if (cleanId.length === 10) return '05';
        
        return null;
    }
};