import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { SRI_TAXPAYER_URL, SRI_ESTABLISHMENT_URL, SRI_CEDULA_URL, SRI_CAPTCHA_URL, SRI_VALIDAR_CAPTCHA_URL } from '../config/env.js';
import { logger } from './logger.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const uSRI = {
    async fetchTaxpayerInfo(ruc) {
        try {
            if (ruc.length !== 13) throw new Error('RUC must be 13 digits long');

            const responseTaxpayer = await this.getResponse(`${SRI_TAXPAYER_URL}${ruc}`);
            if (responseTaxpayer.status === 200 && responseTaxpayer.data) {
                const taxpayer = Array.isArray(responseTaxpayer.data)
                    ? responseTaxpayer.data[0]
                    : responseTaxpayer.data;

                try {
                    const responseEstablishment = await this.getResponse(`${SRI_ESTABLISHMENT_URL}${ruc}`);
                    if (responseEstablishment.data) {
                        taxpayer.establishment = Array.isArray(responseEstablishment.data)
                            ? responseEstablishment.data[0]
                            : responseEstablishment.data;
                    }
                } catch (error) {
                    console.log('Error fetching establishment data:', error);
                    logger.error('uSRI.fetchTaxpayerInfo - Establishment fetch error: ' + error.message);
                }
                return taxpayer;
            }
            throw new Error('Failed to fetch taxpayer information');
        } catch (error) {
            logger.error('uSRI.fetchTaxpayerInfo: ' + error.message);
            throw error;
        }
    },

    async fetchPersonByCedula(cedula) {
        try {
            if (cedula.length !== 10) throw new Error('Cédula must be 10 digits long');
            const session = await this.createSessionSri();

            const response = await session.client.get(SRI_CEDULA_URL, {
                params: {
                    numeroIdentificacion: cedula
                },
                headers: {
                    'Authorization': session.token
                }
            });

            if (response.status === 200 && response.data) {
                return {
                    names: response.data.nombreCompleto,
                    identification: response.data.identificacion
                };
            }

            throw new Error('Failed to fetch person by cédula');
        } catch (error) {
            console.log('Error in fetchPersonByCedula:', error);
            logger.error('uSRI.fetchPersonByCedula: ' + error);

            if (error.response.status === 401 || error.response.status === 403) {
                throw new Error('Unauthorized access when fetching cédula information. Possible invalid token.');
            }

            throw error;
        }
    },

    async getResponse(url) {
        try {
            return await axios.get(url, {
                headers: { 'cache-control': 'no-cache' }
            });
        } catch (error) {
            throw error;
        }
    },

    async createSessionSri() {
        const cookieJar = new CookieJar();

        const client = wrapper(axios.create({
            jar: cookieJar,
            withCredentials: true,
            timeout: 10000,
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'es-EC,es;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Origin': 'https://srienlinea.sri.gob.ec',
                'Referer': 'https://srienlinea.sri.gob.ec/sri-en-linea/SriPagosWeb/ConsultaDeudasFirmesImpugnadas/Consultas/consultaDeudasFirmesImpugnadas'
            }
        }));

        const numRandom = Math.floor(Math.random() * 100000000).toString().padStart(6, '0');
        const startResponse = await client.get(`${SRI_CAPTCHA_URL}${numRandom}`);

        if (!startResponse.data || !startResponse.data.values || startResponse.data.values.length === 0) {
            throw new Error('The security handshake with the SRI could not be initiated.');
        }

        const captchaValue = startResponse.data.values[0];

        const tokenResponse = await client.get(`${SRI_VALIDAR_CAPTCHA_URL}${captchaValue}`, {
            params: {
                emitirToken: 'true'
            }
        });

        const strToken = tokenResponse.data.mensaje;

        if (!strToken || !strToken.startsWith('eyJ')) {
            throw new Error('The SRI did not return a valid token.');
        }

        return { client, token: strToken };
    }
};