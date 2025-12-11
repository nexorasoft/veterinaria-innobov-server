import { Router } from "express";
import { cNotification } from "../../controllers/cNotification.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/main',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cNotification.getNotificationsByUserId
);

router.patch('/:id/seen',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cNotification.markNotificationAsSeen
);

router.get('/main/limit-five',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cNotification.getNotificationsByUserIdLimitFive
);

router.get('/detail/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cNotification.getDetail
);
export default router;