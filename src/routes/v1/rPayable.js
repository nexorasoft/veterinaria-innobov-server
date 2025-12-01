import { Router } from "express";
import { cPayable } from "../../controllers/cPayable.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cPayable.getAllPayables
);

router.post('/:id/payments',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('UPDATE', 'PAYABLES', 'registerPayment'),
    cPayable.registerPayment
);

router.get('/:id/history',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cPayable.getHistory
);

router.get('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cPayable.getPayableDetail
);

export default router;