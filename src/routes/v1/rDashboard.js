import { Router } from "express";
import { cDashboard } from "../../controllers/cDashboard.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/summary',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cDashboard.getSummary
);

router.get('/sales-chart',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cDashboard.getSalesChart
);

router.get('/stock-alerts',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cDashboard.getStockAlerts
);

router.get('/top-products',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cDashboard.getTopProducts
);

router.get('/advanced-stats',
    authenticateUser,
    roleMiddleware(['admin']),
    cDashboard.getAdvancedStats
);

export default router;