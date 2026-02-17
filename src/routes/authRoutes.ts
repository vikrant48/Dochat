import express from 'express';
import {
    registerUser,
    loginUser,
    getUsers,
} from '../controllers/authController';
import { updateProfile, searchUsers, updatePushToken, getUserProfile } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', protect, getUsers);
router.get('/search', protect, searchUsers);
router.get('/profile/:userId', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/push-token', protect, updatePushToken);

export default router;
