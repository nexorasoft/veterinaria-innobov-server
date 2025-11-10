import { Router } from 'express';
import authRoutes from './v1/rAuth.js';

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

export default router;