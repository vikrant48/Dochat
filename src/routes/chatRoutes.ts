import express from 'express';
import { getMessages } from '../controllers/chatController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/:userId/:otherUserId', protect, getMessages);

export default router;
