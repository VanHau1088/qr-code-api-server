import express from 'express';
import { 
    getUserQRCodes, 
    saveQRCode, 
    deleteQRCode, 
    toggleQRCodeStatus, 
    deleteQRStatus,
} from '../controllers/qrController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/user/qrs', auth, getUserQRCodes); // Đảm bảo endpoint chính xác
router.post('/shorten', auth, saveQRCode); // Endpoint để lưu QR code
router.delete('/delete/:id', auth, deleteQRCode); // Endpoint để xóa mã QR
router.patch('/toggle-status/:id', auth, toggleQRCodeStatus);
router.delete('/delete-status/:id', auth, deleteQRStatus);


export default router;



