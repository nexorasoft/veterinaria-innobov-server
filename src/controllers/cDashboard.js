import { sDashboard } from "../services/sDashboard.js";

export const cDashboard = {
    async getSummary(req, res) {
        const result = await sDashboard.getSummary();
        return res.status(result.code).json(result);
    },

    async getSalesChart(req, res) {
        const result = await sDashboard.getSalesChart();
        return res.status(result.code).json(result);
    },

    async getStockAlerts(req, res) {
        const result = await sDashboard.getLowStockAlerts();
        return res.status(result.code).json(result);
    },

    async getTopProducts(req, res) {
        const result = await sDashboard.getTopProducts();
        return res.status(result.code).json(result);
    },

    async getAdvancedStats(req, res) {
        const result = await sDashboard.getAdvancedStats();
        return res.status(result.code).json(result);
    }
};