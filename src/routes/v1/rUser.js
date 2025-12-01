import { Router } from "express";
import { cUser } from "../../controllers/cUser.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/',
    authenticateUser,
    roleMiddleware(['admin']),
    cUser.getAll
);

router.post('/',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'USERS', 'createUser'),
    cUser.create
);

router.get('/roles',
    authenticateUser,
    roleMiddleware(['admin']),
    cUser.getRoles
);

router.get('/profile',
    authenticateUser,
    cUser.getMyProfile
);

router.get('/:id',
    authenticateUser,
    roleMiddleware(['admin']),
    cUser.getDetail
);

router.put('/profile/password',
    authenticateUser,
    roleMiddleware(['admin', 'cashier', 'vet']),
    auditLog('UPDATE', 'USERS', 'changeMyPassword'),
    cUser.changeMyPassword
);

router.put('/:id',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('UPDATE', 'USERS', 'updateUser'),
    cUser.update
);

router.patch('/:id/status',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('PATCH', 'USERS', 'toggleUserStatus'),
    cUser.toggleStatus
);

router.patch('/:id/reset-password',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('PATCH', 'USERS', 'resetUserPassword'),
    cUser.resetPassword
);

export default router;