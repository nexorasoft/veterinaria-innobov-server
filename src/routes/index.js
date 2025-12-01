import { Router } from 'express';
import authRoutes from './v1/rAuth.js';
import paramRoutes from './v1/rParam.js';
import clientRoutes from './v1/rClient.js';
import productRoutes from './v1/rProduct.js';
import supplierRoutes from './v1/rSupplier.js';
import symptomRoutes from './v1/rSymptom.js';
import purchaseRoutes from './v1/rPurchase.js';
import cashRoutes from './v1/rCash.js';
import petRoutes from './v1/rPet.js';
import auditRoutes from './v1/rAudit.js';
import salesRoutes from './v1/rSales.js';
import receivableRoutes from './v1/rReceivable.js';
import payableRoutes from './v1/rPayable.js';
import consultationRoutes from './v1/rConsultation.js';
import vaccinationRoutes from './v1/rVaccionation.js';
import userRoutes from './v1/rUser.js';
import dashboardRoutes from './v1/rDashboard.js';

const router = Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

router.use('/auth', authRoutes);
router.use('/param', paramRoutes);
router.use('/client', clientRoutes);
router.use('/product', productRoutes);
router.use('/supplier', supplierRoutes);
router.use('/symptom', symptomRoutes);
router.use('/purchase', purchaseRoutes);
router.use('/cash', cashRoutes);
router.use('/pet', petRoutes);
router.use('/audit', auditRoutes);
router.use('/sales', salesRoutes);
router.use('/receivable', receivableRoutes);
router.use('/payable', payableRoutes);
router.use('/consultation', consultationRoutes);
router.use('/vaccination', vaccinationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/user', userRoutes);

export default router;