import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mSystem = {
    async getTaxPercentage() {
        try {
            const query = `
                SELECT tax_percentage
                FROM system_settings
                LIMIT 1;
            `;

            const result = await turso.execute(query);

            return result.rows.length > 0 ? result.rows[0].tax_percentage : null;
        } catch (error) {
            logger.error('Error retrieving tax percentage:', error);
            return null;
        }
    }
};