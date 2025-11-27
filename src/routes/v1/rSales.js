import { Router } from "express";
import { cSales } from "../../controllers/cSales.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/catalog',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSales.searchCatalog
);

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'SALES', 'sale'),
    cSales.registerSale
);

router.post('/lookup-client',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSales.lookupClient
);

export default router;