import express from 'express';
import { registerUser, loginUser, getUsers, verify2FA, toggle2FA } from '../controllers/authController';
import { updateProfile, searchUsers, updatePushToken, getUserProfile } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', protect, getUsers);
router.post('/verify-2fa', verify2FA);
router.post('/toggle-2fa', protect, toggle2FA);
router.get('/search', protect, searchUsers);
router.get('/profile/:userId', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/push-token', protect, updatePushToken);

export default router;
