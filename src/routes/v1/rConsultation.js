import { Router } from "express";
import { cConsultation } from "../../controllers/cConsultation.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cConsultation.getAll
);

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    auditLog('CREATE', 'CONSULTATIONS', 'createConsultation'),
    cConsultation.create
);

router.get('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    cConsultation.getDetail
);

router.put('/:id',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    auditLog('UPDATE', 'CONSULTATIONS', 'updateConsultation'),
    cConsultation.update
);

router.delete('/:id',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('DELETE', 'CONSULTATIONS', 'deleteConsultation'),
    cConsultation.delete
);

router.post('/:id/medications',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    auditLog('CREATE', 'CONSULTATIONS', 'addMedications'),
    cConsultation.addMedications
);

router.delete('/:id/medications',
    authenticateUser,
    roleMiddleware(['admin', 'vet', 'assistant']),
    auditLog('DELETE', 'CONSULTATIONS', 'removeMedications'),
    cConsultation.removeMedications
);

export default router;