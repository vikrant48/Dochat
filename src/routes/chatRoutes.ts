import express from 'express';
import { getMessages, markBatchRead, sendMessage } from '../controllers/chatController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/:userId/:otherUserId', protect, getMessages);
router.post('/mark-read', protect, markBatchRead);
router.post('/send', protect, sendMessage);

export default router;
