import { Router } from "express";
import { cSymptom } from "../../controllers/cSymptom.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'doctor']),
    auditLog('CREATE', 'SYMPTOM', 'symptom'),
    cSymptom.createSymptom
);

router.post('/associate-medicine',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('ASSOCIATE', 'SYMPTOM_MEDICINE', 'medicine_symptom'),
    cSymptom.associateSymptomWithMedicine
);

router.post('/search-medicines',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cSymptom.searchMedicinesBySymptoms
);

router.get('/search',
    authenticateUser,
    roleMiddleware(['admin', 'doctor', 'cashier']),
    cSymptom.searchSymptomsByName
);

export default router;