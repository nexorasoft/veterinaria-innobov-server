import { Router } from 'express';
import multer from 'multer';
import { cClient } from '../../controllers/cClient.js';
import authenticateUser from '../../middlewares/verifyToken.js';
import { auditLog } from '../../middlewares/audit.js';
import { roleMiddleware } from '../../middlewares/checkRole.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

router.get('/',
    authenticateUser,
    roleMiddleware(['admin']),
    cClient.getClients
);

router.get('/search',
    authenticateUser,
    roleMiddleware(['admin']),
    cClient.searchClients
);

router.get('/profile/:clientId',
    authenticateUser,
    roleMiddleware(['admin']),
    cClient.getClientFullProfile
);

router.post('/',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'CLIENT', 'client creation'),
    cClient.createClient
);

router.put('/:clientId',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('UPDATE', 'CLIENT', 'client update'),
    cClient.updateClient
);

router.get('/:clientId/account-status',
    authenticateUser,
    roleMiddleware(['admin']),
    cClient.getClientAccountStatus
);

router.post('/:clientId/pets',
    upload.single('image'),
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PET', 'Add pet to client'),
    cClient.addPetToClient
);

router.post('/register-full',
    upload.single('image'),
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'CLIENT_PET', 'Full client and pet registration'),
    cClient.registerFullClient
);

router.get('/identification-types',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cClient.getIdentificationTypes
);

export default router;