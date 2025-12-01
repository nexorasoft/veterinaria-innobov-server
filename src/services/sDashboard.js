import { mDashboard } from "../models/mDashboard.js";
import { logger } from "../utils/logger.js";

export const sDashboard = {
    async getSummary() {
        try {
            const result = await mDashboard.getDailySummary();
            return result;
        } catch (error) {
            logger.error('Service error fetching dashboard summary', error);
            return {
                success: false,
                code: 500,
                message: 'Error interno',
                data: null
            }
        }
    },

    async getSalesChart() {
        try {
            const result = await mDashboard.getSalesChart();
            return result;
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Error interno',
                data: null
            }
        }
    },

    async getLowStockAlerts() {
        try {
            const result = await mDashboard.getLowStockAlerts();
            return result;
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Error interno',
                data: null
            }
        }
    },

    async getTopProducts() {
        try {
            const result = await mDashboard.getTopProducts();
            return result;
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Error interno',
                data: null
            }
        }
    },
    async getAdvancedStats() {
        try {
            const rawData = await mDashboard.getBusinessGrowth();

            const calculateGrowth = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                const percent = ((current - previous) / previous) * 100;
                return parseFloat(percent.toFixed(1));
            };

            return {
                success: true,
                code: 200,
                data: {
                    clients: {
                        total: rawData.clients.total_all_time,
                        new_this_month: rawData.clients.current_month,
                        growth_percentage: calculateGrowth(rawData.clients.current_month, rawData.clients.previous_month)
                    },
                    pets: {
                        total: rawData.pets.total_all_time,
                        new_this_month: rawData.pets.current_month,
                        growth_percentage: calculateGrowth(rawData.pets.current_month, rawData.pets.previous_month)
                    },
                    products: {
                        total: rawData.products.total_all_time,
                        new_this_month: rawData.products.current_month,
                        growth_percentage: calculateGrowth(rawData.products.current_month, rawData.products.previous_month)
                    },
                    supplier_highlight: rawData.top_supplier ? {
                        name: rawData.top_supplier.name,
                        total_volume: rawData.top_supplier.total_bought
                    } : null
                }
            };
        } catch (error) {
            logger.error('Service error fetching advanced stats', error);
            return {
                success: false,
                code: 500,
                message: 'Error interno',
                data: null
            };
        }
    },
};