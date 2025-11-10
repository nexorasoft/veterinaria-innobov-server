import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function generateToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}