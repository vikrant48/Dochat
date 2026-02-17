import express from 'express';
import { getMessages, markBatchRead, sendMessage, getGroupMessages } from '../controllers/chatController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/group/:groupId', protect, getGroupMessages);
router.get('/:userId/:otherUserId', protect, getMessages);
router.post('/mark-read', protect, markBatchRead);
router.post('/send', protect, sendMessage);

export default router;
