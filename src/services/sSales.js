import { mSales } from "../models/mSales.js";
import { mSystem } from "../models/mSystem.js";
import { mClient } from "../models/mClient.js";
import { hSales } from "../helpers/hSales.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';

export const sSales = {
    async searchCatalog(queryParams) {
        try {
            const term = queryParams.term || '';

            if (term.length < 2) {
                return {
                    success: false,
                    code: 400,
                    message: 'Search term must be at least 2 characters long.',
                    data: null
                }
            }

            const result = await mSales.searchCatalog(term);
            return result;
        } catch (error) {
            logger.error('sSales.searchCatalog: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while searching the catalog.',
                data: null
            };
        }
    },

    async registerSale(userId, saleData) {
        try {
            const { client_id, client_data, items, payment_method, notes, discount } = saleData;

            if ((!client_id && !client_data) || !items || items.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Client information and sale items are required.',
                    data: null
                }
            }

            const taxPercentage = await mSystem.getTaxPercentage();
            const taxRate = taxPercentage / 100;
            const divisor = 1 + taxRate;

            let globalSubtotal = 0;
            let globalTax = 0;

            const processedItems = items.map(item => {
                const qty = Number(item.quantity);
                const price = Number(item.price);
                const itemTotalRaw = qty * price;

                let itemBase = 0;
                let itemTax = 0;

                if (!item.taxable) {
                    itemBase = itemTotalRaw;
                    itemTax = itemBase * taxRate;
                }
                else {
                    itemBase = itemTotalRaw / divisor;
                    itemTax = itemTotalRaw - itemBase;
                }

                globalSubtotal += itemBase;
                globalTax += itemTax;

                return {
                    ...item,
                    sale_detail_id: uuidv4(),

                    quantity: qty,
                    price: price,

                    subtotal: parseFloat(itemBase.toFixed(4)),
                    tax_amount: parseFloat(itemTax.toFixed(4)),
                    total_line: parseFloat((itemBase + itemTax).toFixed(2)),

                    item_type: item.service_id ? 'SERVICIO' : 'PRODUCTO'
                };
            });

            const finalDiscount = Number(discount || 0);
            const total = globalSubtotal + globalTax - finalDiscount;

            const isConsumidorFinal =
                (saleData.client_id === 'consumer_final_default') ||
                (saleData.client_data && saleData.client_data.dni === '9999999999999');

            if (isConsumidorFinal && total > 50) {
                return {
                    success: false,
                    code: 400,
                    message: `The amount ($${total.toFixed(2)}) exceeds the allowed limit for Final Consumer ($50.00). You must register the customer’s information.`,
                    data: null
                };
            }

            const salePayload = {
                id: uuidv4(),
                cash_movement_id: uuidv4(),
                user_id: userId,

                client_id: client_id || null,
                client_data: client_data || null,

                payment_method: payment_method,
                notes: notes,
                subtotal: parseFloat(globalSubtotal.toFixed(2)),
                tax: parseFloat(globalTax.toFixed(2)),
                discount: parseFloat(finalDiscount.toFixed(2)),
                total: parseFloat(total.toFixed(2)),
                items: processedItems
            };

            const result = await mSales.registerSale(salePayload);
            return result;
        } catch (error) {
            logger.error('sSales.registerSale: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while registering the sale.',
                data: null
            };
        }
    },

    async lookupClient(clientData) {
        try {
            const { identification } = clientData;

            if (!identification || identification.length < 10 || identification.length > 13) {
                return {
                    success: false,
                    code: 400,
                    message: 'Identification number is required.',
                    data: null
                }
            }

            const localClient = await mClient.getClientBySale(identification);
            if (localClient) {
                return {
                    success: true,
                    code: 200,
                    message: 'Client found locally.',
                    data: localClient
                }
            }

            const externalData = await hSales.getPersonByIdentification(identification);
            console.log('External data retrieved:', externalData); // Debug log
            if (externalData) {
                return {
                    success: true,
                    code: 200,
                    message: 'Client found in external service.',
                    data: externalData
                };
            }

            return {
                success: false,
                code: 404,
                message: 'Client not found.',
                data: null
            };
        } catch (error) {
            logger.error('sSales.lookupClient: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'An error occurred while looking up the client.',
                data: null
            };
        }
    },
};
