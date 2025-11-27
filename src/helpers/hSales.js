import { RUC_DNI_API_URL } from "../config/env.js";
import axios from "axios";
import { logger } from "../utils/logger.js";

export const hSales = {
    async getPersonByIdentification(identification) {
        try {
            const response = await axios.post(RUC_DNI_API_URL, { identification });
            const data = response.data.data.contribuyente;
            return data.nombreComercial || null;
        } catch (error) {
            logger.error('hSales.getPersonByIdentification: ' + error.message);
            return null;
        }
    },
};