import { Router } from "express";
import { cSystem } from "../../controllers/cSystem.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/setup',
    auditLog('CREATE', 'SYSTEM_SETUP', 'system_setup'),
    cSystem.createSetup
);

export default router;
