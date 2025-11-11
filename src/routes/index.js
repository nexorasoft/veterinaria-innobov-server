import { Router } from 'express';
import authRoutes from './v1/rAuth.js';
import paramRoutes from './v1/rParam.js';
import clientRoutes from './v1/rClient.js';

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

export default router;