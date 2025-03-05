import express from 'express';
import { signup, login } from '../controllers/authController.js';
import { getUserQRCodes } from '../controllers/qrController.js';
import auth from '../middleware/auth.js';
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/api/user/qrs', auth, getUserQRCodes);

export default router;
