import { Router } from "express";
import { cSupplier } from "../../controllers/cSupplier.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'SUPPLIER', 'Created supplier'),
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

router.get('/all',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getAllSuppliers
);

router.get('/:id/profile',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getProfile
);

router.put('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('UPDATE', 'SUPPLIER', 'Updated supplier'),
    cSupplier.update
);

router.get('/:id/account',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getAccountStatus
);

router.get('/:id/purchases',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getPurchases
);

router.get('/:id/catalog',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSupplier.getProductsCatalog
);

export default router;