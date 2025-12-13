import { mSales } from "../models/mSales.js";
import { mSystem } from "../models/mSystem.js";
import { mClient } from "../models/mClient.js";
import { hSales } from "../helpers/hSales.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';
import { mInvoice } from "../models/mInvoice.js";
import { sInvoice } from "./sInvoice.js";

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
        const round = (num, decimals = 2) => {
            return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
        };

        try {
            const { client_id, client_data, items, payment_method, notes, discount } = saleData;

            if ((!client_id && !client_data) || !items || items.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'La información del cliente y los items son obligatorios.',
                    data: null
                }
            }

            if (!client_id && client_data && client_data.identification) {
                const sriCode = hSales.inferSriCode(client_data.identification);
                const identificationTypeId = await mClient.getIdentificationTypeIdByCode(sriCode);

                if (!identificationTypeId) {
                    throw new Error(`Error: No existe el tipo de identificación SRI '${sriCode}'.`);
                }
                client_data.identification_type_id = identificationTypeId;
            }

            const { tax_percentage: taxPercentage } = await mSystem.getTaxPercentage();
            const taxRate = taxPercentage / 100;
            const divisor = 1 + taxRate;

            let globalSubtotal = 0;
            let globalTax = 0;

            const processedItems = items.map(item => {
                const qty = Number(item.quantity);
                const inputPrice = Number(item.price);
                const isTaxInclusive = Number(item.taxable) === 1;

                let lineSubtotal = 0;
                let lineTax = 0;
                let lineTotal = 0;

                if (isTaxInclusive) {
                    lineTotal = round(inputPrice * qty, 2);
                    lineSubtotal = round(lineTotal / divisor, 2);
                    lineTax = round(lineTotal - lineSubtotal, 2);

                } else {
                    lineSubtotal = round(inputPrice * qty, 2);
                    lineTax = round(lineSubtotal * taxRate, 2);
                    lineTotal = round(lineSubtotal + lineTax, 2);
                }

                const unitPriceForXml = round(inputPrice / divisor, 2);

                globalSubtotal += lineSubtotal;
                globalTax += lineTax;

                return {
                    ...item,
                    sale_detail_id: uuidv4(),
                    quantity: qty,

                    price: unitPriceForXml,

                    subtotal: lineSubtotal,
                    tax_amount: lineTax,
                    total_line: lineTotal,

                    item_type: item.service_id ? 'SERVICIO' : 'PRODUCTO'
                };
            });

            globalSubtotal = round(globalSubtotal, 2);
            globalTax = round(globalTax, 2);

            const finalDiscount = Number(discount || 0);

            const total = round(globalSubtotal + globalTax - finalDiscount, 2);

            const isConsumidorFinal =
                (saleData.client_id === 'consumer_final_default') ||
                (saleData.client_data && saleData.client_data.identification === '9999999999999');

            if (isConsumidorFinal && total > 50) {
                return {
                    success: false,
                    code: 400,
                    message: `Monto ($${total.toFixed(2)}) excede límite Consumidor Final ($50). Registre cliente.`,
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

                subtotal: globalSubtotal,
                tax: globalTax,
                discount: round(finalDiscount, 2),
                total: total,

                items: processedItems
            };

            const result = await mSales.registerSale(salePayload);

            if (result.success) {
                const saleId = result.data.sale_id;

                setImmediate(async () => {
                    try {
                        const [invoiceData, taxInfo] = await Promise.all([
                            mInvoice.getFullInvoiceData(saleId),
                            mSystem.getTaxPercentage()
                        ]);

                        if (!invoiceData) {
                            logger.error('Invoice generation skipped: invoice data not found', { saleId });
                            return;
                        }

                        delete invoiceData.details_json;
                        invoiceData.id = uuidv4();

                        invoiceData.taxes = {
                            code: "2",
                            tax_code: taxInfo.code_tax,
                            fee: taxInfo.tax_percentage,
                            tax_base: round(invoiceData.total_without_taxes, 2),
                            value: round(invoiceData.total_vat, 2)
                        };

                        invoiceData.details = invoiceData.details.map(d => ({
                            ...d,
                            taxes: {
                                tax: {
                                    code: "2",
                                    tax_code: taxInfo.code_tax,
                                    fee: taxInfo.tax_percentage,
                                    tax_base: round(d.subtotal, 2),
                                    value: round(d.tax_amount, 2)
                                }
                            }
                        }));

                        await sInvoice.createInvoice(invoiceData);
                    } catch (err) {
                        logger.error('Background invoice generation error', err);
                    }
                });

                hSales.checkStockAndNotify(processedItems).catch(err =>
                    logger.error('Background Notification Error', err)
                );
            }


            return result;
        } catch (error) {
            logger.error('sSales.registerSale: ' + error.message);
            return {
                success: false,
                code: 500,
                message: 'Error al registrar venta: ' + error.message,
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
