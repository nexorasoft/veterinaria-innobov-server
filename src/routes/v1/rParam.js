import { Router } from "express";
import { cParam } from "../../controllers/cParam.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/species',
    authenticateUser,
    roleMiddleware(['admin', 'vet']),
    auditLog('CREATE', 'PARAM', 'specie'),
    cParam.createSpecie
);

export default router;