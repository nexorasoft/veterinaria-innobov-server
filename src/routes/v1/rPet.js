import { Router } from 'express';
import { cPet } from '../../controllers/cPet.js';
import authenticateUser from '../../middlewares/verifyToken.js';
import { auditLog } from '../../middlewares/audit.js';
import { roleMiddleware } from '../../middlewares/checkRole.js';
import multer from 'multer';

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
    cPet.getAllPets
);

router.get('/profile/:petId',
    authenticateUser,
    roleMiddleware(['admin']),
    cPet.getPetProfile
);

router.put('/:petId',
    upload.single('image'),
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('UPDATE', 'PET', 'pet update'),
    cPet.updatePet
);

router.post('/:id/weights',
    authenticateUser,
    roleMiddleware(['admin', 'veterinarian']),
    auditLog('CREATE', 'WEIGHT_RECORD', 'Add weight record to pet'),
    cPet.addWeightRecord
);

router.get('/:id/weights',
    authenticateUser,
    roleMiddleware(['admin', 'veterinarian']),
    cPet.getWeightHistory
);

router.delete('/:id/weights/:weightId',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('DELETE', 'WEIGHT_RECORD', 'Delete weight record from pet'),
    cPet.deleteWeightRecord
);

export default router;