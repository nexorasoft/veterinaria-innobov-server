import { Router } from "express";
import { cReceivable } from "../../controllers/cReceivable.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cReceivable.getReceivables
);

router.post('/:id/payments',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('UPDATE', 'RECEIVABLES', 'registerPayment'),
    cReceivable.registerPayment
);

router.get('/:id/history',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cReceivable.getHistory
);

router.get('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cReceivable.getDetail
);

export default router;