import { Router } from "express";
import { cPurchase } from "../../controllers/cPurchase.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'PURCHASE', 'purchase'),
    cPurchase.createPurchase
);

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cPurchase.getPurchases
);

router.get('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cPurchase.getDetailsPurchaseById
);


export default router;