import { Router } from "express";
import { cAuth } from "../../controllers/cAuth.js";

const router = Router();

router.post('/register', cAuth.register);
router.post('/login', cAuth.login);

export default router;