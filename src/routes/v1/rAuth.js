import { Router } from "express";
import { cAuth } from "../../controllers/cAuth.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/register', auditLog('CREATE', 'AUTH', 'user'), cAuth.register);
router.post('/login', auditLog('LOGIN', 'AUTH'), cAuth.login);
router.post('/logout', authenticateUser, auditLog('LOGOUT', 'AUTH'), cAuth.logout);
router.get('/verify', authenticateUser, cAuth.verifySession);

router.get('/test', authenticateUser, roleMiddleware(['admin']), (req, res) => {
    res.json({ message: 'Auth route is working!' });
});

export default router;