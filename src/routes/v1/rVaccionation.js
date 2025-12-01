import { Router } from "express";
import { cVaccination } from "../../controllers/cVaccination.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/pet/:petId',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'receptionist']),
    cVaccination.getByPet
);

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'vet']),
    auditLog('CREATE', 'VACCINATIONS', 'createVaccination'),
    cVaccination.create
);

router.get('/upcoming',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'receptionist']),
    cVaccination.getUpcoming
);

router.delete('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'vet']),
    auditLog('DELETE', 'VACCINATIONS', 'deleteVaccination'),
    cVaccination.delete
);

export default router;