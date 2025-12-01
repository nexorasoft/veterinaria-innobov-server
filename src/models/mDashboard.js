import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mDashboard = {
    async getDailySummary() {
        try {
            const salesSql = `
                SELECT COALESCE(SUM(total), 0) as total_sales, COUNT(*) as count_sales
                FROM sales 
                WHERE date(created_at) = date('now', '-5 hours') AND status != 'ANULADA';
            `;

            const appointmentsSql = `
                SELECT COUNT(*) as total_appointments
                FROM appointments
                WHERE date(date) = date('now', '-5 hours') AND status != 'CANCELADA';
            `;

            const stockSql = `
                SELECT COUNT(*) as low_stock_count
                FROM products
                WHERE active = 1 AND stock <= min_stock;
            `;

            const patientsSql = `
                SELECT COUNT(*) as new_patients
                FROM pets
                WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-5 hours'));
            `;

            const [salesRes, appRes, stockRes, patRes] = await Promise.all([
                turso.execute(salesSql),
                turso.execute(appointmentsSql),
                turso.execute(stockSql),
                turso.execute(patientsSql)
            ]);

            return {
                success: true,
                code: 200,
                message: 'Daily summary fetched successfully',
                data: {
                    sales: salesRes.rows[0],
                    appointments: appRes.rows[0].total_appointments,
                    low_stock: stockRes.rows[0].low_stock_count,
                    new_patients_month: patRes.rows[0].new_patients
                }
            };

        } catch (error) {
            logger.error('Error fetching dashboard summary', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching dashboard summary',
                data: null
            };
        }
    },

    async getSalesChart() {
        try {
            const query = `
                SELECT 
                    date(created_at) as sale_date, 
                    SUM(total) as total_amount
                FROM sales
                WHERE date(created_at) >= date('now', '-7 days', '-5 hours')
                  AND status != 'ANULADA'
                GROUP BY date(created_at)
                ORDER BY date(created_at) ASC;
            `;

            const result = await turso.execute(query);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No sales data for the past week',
                    data: null
                }
            }

            return {
                success: true,
                code: 200,
                message: 'Sales chart data fetched successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching chart data', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching chart data',
                data: null
            }
        }
    },

    async getLowStockAlerts() {
        try {
            const query = `
                SELECT id, name, code, stock, min_stock
                FROM products
                WHERE active = 1 AND stock <= min_stock
                ORDER BY stock ASC
                LIMIT 10; -- Solo mostramos los 10 más críticos
            `;

            const result = await turso.execute(query);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No low stock products found',
                    data: null
                }
            }
            return {
                success: true,
                code: 200,
                message: 'Low stock products fetched successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching low stock', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching low stock products',
                data: null
            };
        }
    },

    async getTopProducts() {
        try {
            const robustQuery = `
                SELECT 
                    COALESCE(p.name, serv.name) as name,
                    SUM(sd.quantity) as total_sold,
                    sd.item_type
                FROM sale_details sd
                JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                LEFT JOIN services serv ON sd.service_id = serv.id
                WHERE s.status != 'ANULADA' 
                AND s.created_at >= date('now', 'start of month')
                GROUP BY COALESCE(p.name, serv.name)
                ORDER BY total_sold DESC
                LIMIT 5;
            `;

            const result = await turso.execute(robustQuery);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    code: 404,
                    message: 'No top products/services found for the month',
                    data: null
                }
            }
            return {
                success: true,
                code: 200,
                message: 'Top products/services fetched successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error fetching top products', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching top products/services',
                data: null
            };
        }
    },

    async getBusinessGrowth() {
        try {
            const getGrowthQuery = (table) => `
                SELECT 
                    -- Total Histórico
                    (SELECT COUNT(*) FROM ${table} WHERE active = 1) as total_all_time,
                    
                    -- Total Este Mes
                    (SELECT COUNT(*) FROM ${table} 
                     WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-5 hours'))) as current_month,
                    
                    -- Total Mes Pasado
                    (SELECT COUNT(*) FROM ${table} 
                     WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-1 month', '-5 hours'))) as previous_month
            `;

            const [clientRes, petRes, productRes] = await Promise.all([
                turso.execute({ sql: getGrowthQuery('clients'), args: [] }),
                turso.execute({ sql: getGrowthQuery('pets'), args: [] }),
                turso.execute({ sql: getGrowthQuery('products'), args: [] })
            ]);

            const supplierSql = `
                SELECT s.name, SUM(p.total) as total_bought
                FROM purchases p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.status = 'PAGADA' 
                AND date(p.created_at) >= date('now', 'start of year')
                GROUP BY s.name
                ORDER BY total_bought DESC
                LIMIT 1;
            `;

            const supplierRes = await turso.execute({ sql: supplierSql, args: [] });

            return {
                clients: clientRes.rows[0],
                pets: petRes.rows[0],
                products: productRes.rows[0],
                top_supplier: supplierRes.rows[0] || null
            };

        } catch (error) {
            logger.error('Error fetching growth stats', error);
            return {
                success: false,
                code: 500,
                message: 'Error fetching business growth statistics',
                data: null
            };
        }
    }
};