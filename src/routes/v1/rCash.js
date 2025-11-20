import { Router } from "express";
import { cCash } from "../../controllers/cCash.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'CASH', 'cash register'),
    cCash.createCash
);

router.post('/shift',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'CASH', 'cash shift'),
    cCash.registerCashShift
);

router.post('/deposit-money',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'CASH', 'cash movement - deposit money'),
    cCash.depositMoney
);

router.post('/withdraw-money',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'CASH', 'cash movement - withdraw money'),
    cCash.withdrawMoney
);

router.get('/expected-amount/:cashRegisterId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.calculateExpectedCashAmount
);

router.get('/open-shifts/user',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.getOpenShiftsByUser
);

router.get('/current-shift-header/user',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.getCurrentShiftHeader
);

router.get('/current-shift-kpis/user',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.getCurrentShiftKPIs
);

router.get('/current-shift-movements/user',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.getCurrentShiftMovements
);

router.get('/available-cash-registers',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cCash.getAvailableCashRegisters
);

export default router;