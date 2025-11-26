import { Router } from "express";
import { cParam } from "../../controllers/cParam.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();


//category
router.post('/categories',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PARAM', 'category'),
    cParam.createCategory
);

router.get('/categories',
    authenticateUser,
    roleMiddleware(['admin']),
    cParam.getCategories
);

router.get('/categories/search',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cParam.searchCategoriesByName
);

router.get('/categories/:id',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cParam.getCategoryById
);

router.put('/categories/:id',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('UPDATE', 'PARAM', 'category'),
    cParam.updateCategory
);

router.delete('/categories/:id',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('DELETE', 'PARAM', 'category'),
    cParam.deleteCategory
);

//specie
router.post('/species',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'PARAM', 'specie'),
    cParam.createSpecie
);

router.get('/species/dropdown',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cParam.getSpeciesForDropdown
);

//module
router.post('/modules',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PARAM', 'module'),
    cParam.createModule
);

router.get('/modules/role/:roleId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cParam.getModulesByRole
);

//permission
router.post('/permissions',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('CREATE', 'PARAM', 'permission'),
    cParam.createPermission
);

export default router;