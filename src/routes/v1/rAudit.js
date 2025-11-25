import { Router } from 'express';
import { cAudit } from '../../controllers/cAudit.js';
import authenticateUser from '../../middlewares/verifyToken.js';
import { roleMiddleware } from '../../middlewares/checkRole.js';

const router = Router();

router.get('/',
    authenticateUser,
    roleMiddleware(['admin']),
    cAudit.getLogs
);

router.get('/my-activity',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cAudit.getMyActivity
);

router.get('/:logId',
    authenticateUser,
    roleMiddleware(['admin']),
    cAudit.getLogById
);

router.get('/filters/options',
    authenticateUser,
    roleMiddleware(['admin']),
    cAudit.getFilterOptions
);

router.get('/logs/stats',
    authenticateUser,
    roleMiddleware(['admin']),
    cAudit.getStats
);

export default router;