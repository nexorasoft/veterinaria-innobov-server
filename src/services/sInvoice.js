import { mInvoice } from "../models/mInvoice.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';
import { convertDateTime, getCurrentDateForSRI, getCurrentDateTimeWithMs, getSriPaymentCode } from "../utils/methods.js";
import { generateAccessKey } from "../utils/invoice.js";
import { buildInvoiceXML } from "../utils/xml.js";
import { hElectronicBilling } from "../helpers/hElectronicBilling.js";
import { hSend } from "../helpers/hSend.js";

export const sInvoice = {
    async createInvoice(invoiceData) {
        try {
            const requiredFields = [
                'details', 'client_identification', 'identification_type_code',
                'client_name', 'total_without_taxes', 'total_vat', 'total_with_taxes',
                'ruc_company'
            ];

            for (const field of requiredFields) {
                if (invoiceData[field] === undefined || invoiceData[field] === null) {
                    return {
                        success: false,
                        code: 400,
                        message: `Missing required field: ${field}`,
                        data: null
                    };
                }
            }

            if (!Array.isArray(invoiceData.details) || invoiceData.details.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invoice must have at least one detail item.',
                    data: null
                };
            }

            invoiceData.id = invoiceData.id || uuidv4();

            const [accessKeyData, nextSequential, nextFullSequential] = await Promise.all([
                mInvoice.getAccessKeyData(),
                mInvoice.getNextSequential(),
                mInvoice.getNextFullInvoiceNumber()
            ]);

            if (!accessKeyData || !nextSequential || !nextFullSequential) {
                return {
                    success: false,
                    code: 500,
                    message: 'Unable to generate invoice sequencing/access key data.',
                    data: null
                };
            }

            accessKeyData.sequential_number = nextFullSequential;
            accessKeyData.numeric_code = Math.floor(10000000 + Math.random() * 89999999).toString();

            invoiceData.access_key = generateAccessKey(accessKeyData);
            invoiceData.sequential = nextSequential;
            invoiceData.issue_date = invoiceData.issue_date || getCurrentDateForSRI();

            const isCredit = invoiceData.payment_method === 'CREDITO';
            const daysToPay = isCredit ? (invoiceData.days_to_pay || '30') : '0';

            const xmlInvoiceData = {
                taxInformation: {
                    environment: accessKeyData.environment_type,
                    emission_type: accessKeyData.emission_type,
                    issuer_legal_name: accessKeyData.business_name,
                    issuer_trade_name: accessKeyData.trade_name,
                    issuer_ruc: accessKeyData.ruc,
                    access_key: invoiceData.access_key,
                    document_type: invoiceData.document_type || '01',
                    establishment_code: accessKeyData.establishment_code,
                    emission_point: accessKeyData.emission_point,
                    sequential: invoiceData.sequential,
                    issuer_headquarters_address: accessKeyData.headquarters_address || 'Dirección no especificada',
                },

                infoInvoice: {
                    issue_date: invoiceData.issue_date,
                    establishment_address: accessKeyData.establishment_address || 'Dirección no especificada',
                    special_taxpayer: accessKeyData.special_taxpayer || 0,
                    accounting_obligation: accessKeyData.accounting_obligation === 1 ? 'SI' : 'NO',
                    buyer_identification_type: invoiceData.identification_type_code,
                    buyer_legal_name: invoiceData.client_name,
                    buyer_identification: invoiceData.client_identification,
                    buyer_address: invoiceData.client_address || 'Dirección no especificada',
                    buyer_email: invoiceData.client_email,
                    buyer_phone: invoiceData.client_phone,

                    total_without_taxes: Number(invoiceData.total_without_taxes).toFixed(2),
                    total_discounts: Number(invoiceData.total_discounts || 0).toFixed(2),

                    taxes: [
                        {
                            tax_code: invoiceData.taxes.code || "2",
                            tax_percentage_code: invoiceData.taxes.tax_percentage_code || "4",
                            tax_base: Number(invoiceData.taxes.tax_base).toFixed(2),
                            tax_value: Number(invoiceData.taxes.value).toFixed(2)
                        }
                    ],

                    tip: invoiceData.tip || '0.00',
                    total_amount: Number(invoiceData.total_with_taxes).toFixed(2),
                    currency: invoiceData.currency || 'DOLAR',

                    payments: [
                        {
                            payment_method: isCredit ? '20' : getSriPaymentCode(invoiceData.payment_method),
                            total: Number(invoiceData.total_with_taxes).toFixed(2),
                            days_to_pay: daysToPay,
                            time_unit: 'DIAS'
                        }
                    ]
                },

                details: invoiceData.details.map(d => ({
                    main_code: d.main_code,
                    description: d.description,
                    quantity: Number(d.quantity).toFixed(6),
                    unit_price: Number(d.unit_price).toFixed(6),
                    discount: Number(d.discount || 0).toFixed(2),
                    total_without_taxes: Number(d.subtotal).toFixed(2),
                    taxes: [
                        {
                            tax_code: "2",
                            tax_percentage_code: d.taxes.tax.tax_code,
                            tax_fee: Number(d.taxes.tax.fee).toFixed(2),
                            tax_base: Number(d.taxes.tax.tax_base).toFixed(2),
                            tax_value: Number(d.taxes.tax.value).toFixed(2)
                        }
                    ]
                }))
            };

            const xml = buildInvoiceXML(xmlInvoiceData);
            invoiceData.xml = xml;

            const signedResult = await hElectronicBilling.signInvoiceXML(invoiceData.xml);
            if (!signedResult.success && !signedResult.signedXml) {
                return {
                    success: false,
                    code: 500,
                    message: signedResult?.message || 'Fallo al firmar XML.',
                    data: null
                };
            }

            invoiceData.signed_xml = signedResult.signedXml;


            invoiceData.status = 'SIGNED';
            invoiceData.sri_status = 'PENDING';
            invoiceData.original_data = JSON.stringify(invoiceData);
            invoiceData.sri_sent_at = getCurrentDateTimeWithMs();
            const createdInvoice = await mInvoice.createInvoice(invoiceData);

            try {
                const responsesSRI = await hElectronicBilling.sendInvoiceToSRI(invoiceData.signed_xml);
                invoiceData.sri_response_at = getCurrentDateTimeWithMs();
                invoiceData.sri_status = responsesSRI.estado;
                invoiceData.sri_messages = JSON.stringify(responsesSRI.mensajes || []);

                await mInvoice.updateSRIStatus(invoiceData.id, {
                    sri_status: invoiceData.sri_status,
                    sri_messages: invoiceData.sri_messages,
                    sri_response_at: invoiceData.sri_response_at
                });

                if (responsesSRI.estado === 'RECIBIDA') {
                    await new Promise(resolve => setTimeout(resolve, 2500));

                    const authResponse = await hElectronicBilling.getAuthorizationFromSRI(invoiceData.access_key);
                    const isAuthorized = authResponse.estado === 'AUTORIZADO';
                    const xmlAuthorized = (isAuthorized && authResponse.comprobante) ? authResponse.comprobante : null;

                    invoiceData.xml_authorized = xmlAuthorized;
                    createdInvoice.sri_status = authResponse.estado;
                    createdInvoice.authorization_date = convertDateTime(authResponse.fechaAutorizacion);

                    await mInvoice.updateAuthorization(invoiceData.id, {
                        authorization_number: authResponse.numeroAutorizacion || invoiceData.access_key,
                        authorization_date: convertDateTime(authResponse.fechaAutorizacion),
                        sri_status: authResponse.estado,
                        xml_authorized: xmlAuthorized
                    });

                    if (isAuthorized) {
                        logger.info(`Factura ${invoiceData.sequential} autorizada exitosamente.`);

                        Object.assign(invoiceData, {
                            issuer_legal_name: xmlInvoiceData.taxInformation.issuer_legal_name,
                            issuer_headquarters_address: xmlInvoiceData.taxInformation.issuer_headquarters_address,
                            establishment_address: xmlInvoiceData.infoInvoice.establishment_address,
                            accounting_obligation: xmlInvoiceData.infoInvoice.accounting_obligation,
                            issuer_ruc: xmlInvoiceData.taxInformation.issuer_ruc,
                            establishment_code: xmlInvoiceData.taxInformation.establishment_code,
                            emission_point: xmlInvoiceData.taxInformation.emission_point,
                            sequential_number: xmlInvoiceData.taxInformation.sequential,
                            authorization_number: authResponse.numeroAutorizacion,
                            authorization_date: convertDateTime(authResponse.fechaAutorizacion),
                            environment: xmlInvoiceData.taxInformation.environment,
                            payment_method: isCredit ? 'CREDITO' : invoiceData.payment_method
                        });

                        const emailResult = await hSend.sendRideEmail(invoiceData);
                        console.log(`Envío de email para factura ${invoiceData.sequential}:`, emailResult);

                    } else {
                        logger.warn(`Factura ${invoiceData.sequential} procesada pero NO autorizada. Estado SRI: ${authResponse.estado}`);
                    }

                } else {
                    logger.warn(`Factura ${invoiceData.sequential} no fue recibida por el SRI. Estado: ${responsesSRI.estado}`);
                }
            } catch (sriError) {
                logger.error('Error de comunicación con SRI (Factura guardada localmente):', sriError);
                await mInvoice.updateSRIStatus(invoiceData.id, {
                    sri_status: 'NETWORK_ERROR',
                    sri_messages: JSON.stringify([{ mensaje: 'Error de red o timeout con el SRI. Reintente luego.', error: sriError.message }])
                });
            }
            return {
                success: true,
                code: 201,
                message: 'Factura generada y procesada.',
                data: createdInvoice
            };
        } catch (error) {
            logger.error('sInvoice.createInvoice error:', error);
            return {
                success: false,
                code: 500,
                message: 'Error generating invoice XML',
                data: null
            };
        }
    }
};