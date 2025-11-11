import { Router } from "express";
import { cParam } from "../../controllers/cParam.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/species',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'PARAM', 'specie'),
    cParam.createSpecie
);

router.post('/modules',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PARAM', 'module'),
    cParam.createModule
);

router.post('/permissions',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PARAM', 'permission'),
    cParam.createPermission
);

router.get('/modules/role/:roleId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('READ', 'PARAM', 'modules_by_role'),
    cParam.getModulesByRole
);

export default router;