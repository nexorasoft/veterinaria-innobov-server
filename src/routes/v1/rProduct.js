import { Router } from "express";
import { cProduct } from "../../controllers/cProduct.js";
import authenticateUser from "../../middlewares/verifyToken.js";
import { auditLog } from "../../middlewares/audit.js";
import { roleMiddleware } from "../../middlewares/checkRole.js";

const router = Router();

router.post('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('CREATE', 'PRODUCT', 'product'),
    cProduct.createProduct
);

router.get('/',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getProducts
);

router.get('/search',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.searchProducts
);

router.get('/category/:categoryId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getProductsByCategory
);

router.get('/status',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getProductsByStatus
);

router.get('/low-stock',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getLowStockProducts
);

router.get('/:productId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getProductDetailsById
);

router.put('/:productId',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    auditLog('UPDATE', 'PRODUCT', 'product'),
    cProduct.updateProduct
);

router.patch('/:productId',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('DELETE', 'PRODUCT', 'product'),
    cProduct.softDeleteProduct
);

router.patch('/:productId/activate',
    authenticateUser,
    roleMiddleware(['admin']),
    auditLog('ACTIVATE', 'PRODUCT', 'product'),
    cProduct.activateProduct
);

router.get('/get/medicines',
    authenticateUser,
    roleMiddleware(['admin', 'cashier']),
    cProduct.getMedicineProducts
);

export default router;