import { Router } from 'express';
import { cClient } from '../../controllers/cClient.js';
import authenticateUser from '../../middlewares/verifyToken.js';
import { auditLog } from '../../middlewares/audit.js';
import { roleMiddleware } from '../../middlewares/checkRole.js';

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE or GET', 'CLIENT', 'client'),
    cClient.getOrCreateClient
);

export default router;