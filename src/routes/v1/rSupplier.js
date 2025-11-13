import { Router } from "express";
import { cSupplier } from "../../controllers/cSupplier.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'SUPPLIER'),
    cSupplier.createSupplier
);

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getSuppliers
);

router.get('/search',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.searchSupplier
);

export default router;