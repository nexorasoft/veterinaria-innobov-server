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

router.get('/medicine/associated',
    authenticateUser,
    roleMiddleware(['admin', 'doctor', 'cashier']),
    cSymptom.getMedicineSymptoms
);

router.put('/medicine/associated/:medicineId/:symptomId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('PUT', 'ASSOCIATE_SYMPTOM_MEDICINE', 'medicine_symptom'),
    cSymptom.updateAssociatedSymptomEffectiveness
);

router.delete('/medicine/associated/:medicineId/:symptomId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('DELETE', 'ASSOCIATE_SYMPTOM_MEDICINE', 'medicine_symptom'),
    cSymptom.deleteAssociatedSymptom
);

router.get('/medicine/associated/:medicineId/:symptomId',
    authenticateUser,
    roleMiddleware(['admin', 'doctor', 'cashier']),
    auditLog('GET', 'ASSOCIATE_SYMPTOM_MEDICINE', 'medicine_symptom'),
    cSymptom.getDetailAssociatedSymptoms
);

router.get('/medicine/associated/search',
    authenticateUser,
    roleMiddleware(['admin', 'doctor', 'cashier']),
    cSymptom.searchAssociatedSymptoms
);

export default router;