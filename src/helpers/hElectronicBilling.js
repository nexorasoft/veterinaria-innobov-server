import { mSystem } from "../models/mSystem.js";
import { decrypt } from "../utils/encryption.js";
import axios from 'axios';
import { Buffer } from 'buffer';
import { DOMParser } from '@xmldom/xmldom';
import { signInvoiceXml } from 'ec-sri-invoice-signer';


import { SRI_ENVIRONMENT, SRI_RECEPCION_URL_PRUEBAS, SRI_RECEPCION_URL_PRODUCCION, SRI_AUTORIZACION_URL_PRODUCCION, SRI_AUTORIZACION_URL_PRUEBAS } from "../config/env.js";

const WSDL_PRUEBAS_RECEPCION =
    SRI_RECEPCION_URL_PRUEBAS ||
    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';

const WSDL_PRODUCCION_RECEPCION =
    SRI_RECEPCION_URL_PRODUCCION ||
    'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';

const WSDL_PRUEBAS_AUTORIZACION =
    SRI_AUTORIZACION_URL_PRUEBAS ||
    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

const WSDL_PRODUCCION_AUTORIZACION =
    SRI_AUTORIZACION_URL_PRODUCCION ||
    'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

export const hElectronicBilling = {
    async signInvoiceXML(xmlString) {
        try {
            const settings = await mSystem.getInfoCertificate();

            if (!settings.certificate || !settings.certificate_password) {
                throw new Error('No hay firma electrónica configurada en el sistema.');
            }

            const cleanPassword = decrypt(settings.certificate_password);

            const signedXml = signInvoiceXml(
                xmlString,
                settings.certificate,
                { pkcs12Password: cleanPassword }
            );

            //            await mInvoices.updateSignedXml(invoiceId, signedXml);

            return { success: true, signedXml };

        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    async sendInvoiceToSRI(signedXml) {
        try {
            const xmlBase64 = Buffer.from(signedXml).toString('base64');

            const soapRequestBody =
                '<?xml version="1.0" encoding="UTF-8"?>' +
                '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
                '<soap:Header/>' +
                '<soap:Body>' +
                '<ec:validarComprobante>' +
                '<xml>' +
                xmlBase64 +
                '</xml>' +
                '</ec:validarComprobante>' +
                '</soap:Body>' +
                '</soap:Envelope>'
                ;

            const headers = {
                'Content-Type': 'text/xml; charset=utf-8',
            };

            try {
                const response = await axios.post(this.getWsdlUrl(), soapRequestBody, {
                    headers,
                    timeout: 15000,
                });

                if (typeof response.data === 'string') {
                    return this.parseXmlResponse(response.data);
                }
            } catch (error) {
                headers['SOAPAction'] = '"http://ec.gob.sri.ws.recepcion/validarComprobante"';

                try {
                    const response = await axios.post(this.getWsdlUrl(), soapRequestBody, {
                        headers,
                        timeout: 15000,
                    });

                    if (typeof response.data === 'string') {
                        return this.parseXmlResponse(response.data);
                    }
                } catch (retryError) {
                    return {
                        estado: 'ERROR_COMUNICACION',
                        mensajes: {
                            mensaje: {
                                identificador: '000',
                                mensaje: `Error de comunicación con SRI: ${retryError.message}`,
                                tipo: 'ERROR',
                            },
                        },
                    };
                }
            }

            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: {
                    mensaje: {
                        identificador: '000',
                        mensaje: 'No se pudo comunicar con el servicio del SRI',
                        tipo: 'ERROR',
                    },
                },
            };
        } catch (error) {
            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: {
                    mensaje: {
                        identificador: '000',
                        mensaje: `Error de comunicación con SRI: ${error.message}`,
                        tipo: 'ERROR',
                    },
                },
            };
        }
    },

    async getAuthorizationFromSRI(claveAcceso) {
        try {
            const soapRequestBody =
                '<?xml version="1.0" encoding="UTF-8"?>' +
                '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
                '<soapenv:Header/>' +
                '<soapenv:Body>' +
                '<ec:autorizacionComprobante>' +
                `<claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>` +
                '</ec:autorizacionComprobante>' +
                '</soapenv:Body>' +
                '</soapenv:Envelope>';

            const headers = {
                'Content-Type': 'text/xml; charset=utf-8',
            };

            const response = await axios.post(this.getWsdlUrlAutorizacion(), soapRequestBody, {
                headers,
                timeout: 15000,
            });

            if (typeof response.data === 'string') {
                return this.parseAuthorizationResponse(response.data);
            }

            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: {
                    mensaje: {
                        identificador: '000',
                        mensaje: 'Respuesta inválida del SRI',
                        tipo: 'ERROR',
                    },
                },
            };
        } catch (error) {
            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: {
                    mensaje: {
                        identificador: '000',
                        mensaje: `Error de comunicación con SRI: ${error.message}`,
                        tipo: 'ERROR',
                    },
                },
            };
        }
    },


    async processAuthorizationAndEmailAsync(invoiceData, xmlInvoiceData, issuerLegalName) {
        try {
            await new Promise(resolve => setTimeout(resolve, 3000));


        } catch (error) {

        }
    },

    parseXmlResponse(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

            const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
            if (faultElements.length > 0) {
                const faultString =
                    faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Error SOAP desconocido';
                return {
                    estado: 'ERROR_SOAP',
                    mensajes: {
                        mensaje: {
                            identificador: '001',
                            mensaje: `Error SOAP: ${faultString}`,
                            tipo: 'ERROR',
                        },
                    },
                };
            }

            let elementStatus = xmlDoc.getElementsByTagName('estado')[0];

            if (!elementStatus) {
                const elementsResponse = xmlDoc.getElementsByTagName('RespuestaRecepcionComprobante');
                if (elementsResponse.length > 0) {
                    elementStatus = elementsResponse[0].getElementsByTagName('estado')[0];
                }
            }

            const status = elementStatus ? elementStatus.textContent || 'DESCONOCIDO' : 'DESCONOCIDO';
            const response = { estado: status, mensajes: [] };

            const elementsMessages = xmlDoc.getElementsByTagName('mensaje');
            if (elementsMessages.length > 0) {
                const messages = [];
                for (let i = 0; i < elementsMessages.length; i++) {
                    const elementMessage = elementsMessages[i];
                    const identificator = elementMessage.getElementsByTagName('identificador')[0]?.textContent || '';
                    const message = elementMessage.getElementsByTagName('mensaje')[0]?.textContent || '';
                    const type = elementMessage.getElementsByTagName('tipo')[0]?.textContent || 'INFO';
                    const additionalInfo = elementMessage.getElementsByTagName('informacionAdicional')[0]?.textContent;

                    const messageObj = {
                        identificator,
                        mensaje: message,
                        tipo: type,
                    };

                    if (additionalInfo) {
                        messageObj.informacionAdicional = additionalInfo;
                    }

                    messages.push(messageObj);
                }

                if (messages.length === 1) {
                    response.mensajes = { mensaje: messages[0] };
                } else if (messages.length > 1) {
                    response.mensajes = { mensaje: messages };
                }
            }

            const elementsVouchers = xmlDoc.getElementsByTagName('comprobante');
            if (elementsVouchers.length > 0) {
                const vouchers = [];
                for (let i = 0; i < elementsVouchers.length; i++) {
                    const voucherElement = elementsVouchers[i];
                    const accessKey = voucherElement.getElementsByTagName('claveAcceso')[0]?.textContent || '';

                    vouchers.push({ claveAcceso: accessKey });
                }
                response.comprobantes = { comprobante: vouchers };
            }

            return response;
        } catch (error) {
            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: {
                    mensaje: {
                        identificador: '000',
                        mensaje: `Error de comunicación con SRI: ${error.message}`,
                        tipo: 'ERROR',
                    },
                },
            };
        }
    },

    parseAuthorizationResponse(xmlString) {
        // console.log('Parsing Authorization Response XML', xmlString);
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

            const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
            if (faultElements.length > 0) {
                const faultString =
                    faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Error SOAP desconocido';
                return {
                    estado: 'ERROR_SOAP',
                    mensajes: {
                        mensaje: { identificador: '001', mensaje: `Error SOAP: ${faultString}`, tipo: 'ERROR' },
                    },
                };
            }

            const response = {
                claveAccesoConsultada: null,
                numeroComprobantes: 0,
                autorizaciones: []
            };

            const claveAccesoElements = xmlDoc.getElementsByTagName('claveAccesoConsultada');
            if (claveAccesoElements.length > 0) response.claveAccesoConsultada = claveAccesoElements[0].textContent;

            const numeroComprobantesElements = xmlDoc.getElementsByTagName('numeroComprobantes');
            if (numeroComprobantesElements.length > 0) response.numeroComprobantes = parseInt(numeroComprobantesElements[0].textContent) || 0;

            if (response.numeroComprobantes === 0) {
                return {
                    estado: 'NO_AUTORIZADO',
                    claveAcceso: response.claveAccesoConsultada,
                    mensaje: 'Comprobante no encontrado en el SRI'
                };
            }

            const autorizacionElements = xmlDoc.getElementsByTagName('autorizacion');

            for (let i = 0; i < autorizacionElements.length; i++) {
                const autoEl = autorizacionElements[i];

                // Extraemos los valores individuales
                const estado = autoEl.getElementsByTagName('estado')[0]?.textContent || '';
                const numeroAutorizacion = autoEl.getElementsByTagName('numeroAutorizacion')[0]?.textContent || '';
                const fechaAutorizacion = autoEl.getElementsByTagName('fechaAutorizacion')[0]?.textContent || '';
                const ambiente = autoEl.getElementsByTagName('ambiente')[0]?.textContent || '';

                let facturaOriginalXml = autoEl.getElementsByTagName('comprobante')[0]?.textContent || '';

                if (facturaOriginalXml.includes('&lt;')) {
                    facturaOriginalXml = facturaOriginalXml
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"');
                }

                if (facturaOriginalXml && !facturaOriginalXml.trim().startsWith('<?xml')) {
                    facturaOriginalXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + facturaOriginalXml;
                }

                const xmlAutorizadoFinal = `<?xml version="1.0" encoding="UTF-8"?>
                    <autorizacion>
                        <estado>${estado}</estado>
                        <numeroAutorizacion>${numeroAutorizacion}</numeroAutorizacion>
                        <fechaAutorizacion>${fechaAutorizacion}</fechaAutorizacion>
                        <ambiente>${ambiente}</ambiente>
                        <comprobante><![CDATA[${facturaOriginalXml}]]></comprobante>                        
                    </autorizacion>
                `;

                const mensajes = [];
                const mensajeElements = autoEl.getElementsByTagName('mensaje');
                for (let j = 0; j < mensajeElements.length; j++) {
                    mensajes.push({
                        identificador: mensajeElements[j].getElementsByTagName('identificador')[0]?.textContent || '',
                        mensaje: mensajeElements[j].getElementsByTagName('mensaje')[0]?.textContent || '',
                        informacionAdicional: mensajeElements[j].getElementsByTagName('informacionAdicional')[0]?.textContent || '',
                        tipo: 'INFO'
                    });
                }

                response.autorizaciones.push({
                    estado,
                    numeroAutorizacion,
                    fechaAutorizacion,
                    ambiente,
                    comprobante: xmlAutorizadoFinal,
                    mensajes,
                    claveAcceso: response.claveAccesoConsultada
                });
            }

            if (response.autorizaciones.length > 0) {
                return response.autorizaciones[0];
            }

            return { estado: 'ERROR', mensaje: 'Respuesta vacía' };

        } catch (error) {
            console.error('Error parseando XML SRI:', error);
            return {
                estado: 'ERROR_COMUNICACION',
                mensajes: { mensaje: { identificador: '000', mensaje: error.message, tipo: 'ERROR' } }
            };
        }
    },

    getWsdlUrl() {
        const environment = SRI_ENVIRONMENT || '1';
        return environment === '2' ? WSDL_PRODUCCION_RECEPCION : WSDL_PRUEBAS_RECEPCION;
    },

    getWsdlUrlAutorizacion() {
        const environment = SRI_ENVIRONMENT || '1';
        return environment === '2' ? WSDL_PRODUCCION_AUTORIZACION : WSDL_PRUEBAS_AUTORIZACION;
    }
};