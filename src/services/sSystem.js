import { hSystem } from "../helpers/hSystem.js";
import { mSystem } from "../models/mSystem.js";
import { encrypt } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';

let cachedTax = null;
let lastCacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

export const sSystem = {
    async getTaxPercentage() {
        const currentTime = Date.now();
        if (!cachedTax && (currentTime - lastCacheTime) > CACHE_DURATION) {
            const value = await mSystem.getTaxPercentage();
            cachedTax = value ? parseFloat(value) : 0.15;
            lastCacheTime = currentTime;
        }
        return cachedTax;
    },

    async createSetup(settingsData) {
        try {
            const requiredFields = [
                'admin_name', 'admin_email', 'admin_password',
                'ruc', 'business_name', 'trade_name', 'address',
                'headquarters_address', 'establishment_address',
                'company_phone', 'company_email', 'certificate_path',
                'certificate_password', 'master_key'
            ];

            for (const field of requiredFields) {
                if (!settingsData[field]) {
                    return {
                        success: false,
                        code: 400,
                        message: `El campo ${field} es obligatorio.`,
                        data: null
                    };
                }
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(settingsData.admin_email) || !emailRegex.test(settingsData.company_email)) {
                return {
                    success: false,
                    message: 'Invalid email format',
                    code: 400,
                    data: null
                };
            }

            if (settingsData.ruc.length !== 13) {
                return {
                    success: false,
                    code: 400,
                    message: 'El RUC debe tener 13 caracteres.',
                    data: null
                };
            }

            const securityCheck = await hSystem.validateRegistrationSecurity(settingsData);
            if (!securityCheck.success) {
                return securityCheck;
            }

            let certificateBase64 = null;
            if (settingsData.certificate_path) {
                try {
                    const certificateBuffer = readFileSync(settingsData.certificate_path);
                    certificateBase64 = certificateBuffer.toString('base64');
                } catch (fileError) {
                    logger.error('Error reading certificate file:', fileError);
                    return {
                        success: false,
                        code: 500,
                        message: 'Error al leer el archivo del certificado.',
                        data: null
                    };
                }
            }

            const encryptedCertificatePassword = settingsData.certificate_password
                ? encrypt(settingsData.certificate_password)
                : null;

            const hashedPassword = await bcrypt.hash(settingsData.admin_password, 10);

            const admin_id = uuidv4();
            const settings_id = 'main';

            const newSettingsData = {
                admin_id: admin_id,
                admin_name: settingsData.admin_name,
                admin_email: settingsData.admin_email,
                admin_phone: settingsData.admin_phone || null,
                admin_password: hashedPassword,
                settings_id: settings_id,
                ruc: settingsData.ruc,
                business_name: settingsData.business_name,
                trade_name: settingsData.trade_name,
                address: settingsData.address,
                headquarters_address: settingsData.headquarters_address,
                establishment_address: settingsData.establishment_address,
                company_phone: settingsData.company_phone || null,
                company_email: settingsData.company_email || null,
                establishment_code: settingsData.establishment_code || '001',
                emission_point: settingsData.emission_point || '001',
                environment_type: settingsData.environment_type || 1,
                emission_type: settingsData.emission_type || 1,
                accounting_obligation: settingsData.accounting_obligation || false,
                special_taxpayer: settingsData.special_taxpayer || null,
                notification_email: settingsData.notification_email || null,
                certificate: certificateBase64,
                certificate_password: encryptedCertificatePassword,
                logo_url: settingsData.logo_url || null,
                logo_public_id: settingsData.logo_public_id || null,
                tax_percentage: settingsData.tax_percentage || 15.0
            }

            const result = await mSystem.createSettings(newSettingsData);

            return result;
        } catch (error) {
            logger.error('Error in createSetup service', error);
            return {
                success: false,
                code: 500,
                message: 'Error interno del servidor.',
                data: null
            };
        }
    }
};