import express from 'express';
import { registerUser, loginUser, getUsers } from '../controllers/authController';
import { updateProfile } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', protect, getUsers);
router.put('/profile', protect, updateProfile);

export default router;
