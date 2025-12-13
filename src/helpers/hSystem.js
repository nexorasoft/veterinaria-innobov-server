import { mSystem } from "../models/mSystem.js";
import { MASTER_REGISTRATION_KEY } from "../config/env.js";

export const hSystem = {
    async validateRegistrationSecurity(systemData) {
        const { master_key } = systemData;

        const isFresh = await mSystem.isSystemFresh();

        if (!isFresh) {
            return {
                success: false,
                code: 403,
                message: 'El sistema ya está configurado. No se puede volver a ejecutar el setup inicial.',
                data: null
            };
        }

        const requiredMasterKey = MASTER_REGISTRATION_KEY;

        if (!requiredMasterKey) {
            return {
                success: false,
                code: 500,
                message: 'Error de servidor: Master Key no configurada.',
                data: null
            };
        }

        if (master_key !== requiredMasterKey) {
            return {
                success: false,
                code: 401,
                message: 'Llave maestra inválida.',
                data: null
            };
        }

        return { success: true, code: 200, message: 'Validación exitosa.', data: null };
    }
};