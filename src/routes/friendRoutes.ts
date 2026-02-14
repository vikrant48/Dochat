import express from 'express';
import {
    sendFriendRequest,
    respondToRequest,
    getFriendRequests,
    getFriends,
    getConnectionStatus
} from '../controllers/friendController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/send', protect, sendFriendRequest);
router.post('/respond', protect, respondToRequest);
router.get('/requests', protect, getFriendRequests);
router.get('/friends', protect, getFriends);
router.get('/status/:otherUserId', protect, getConnectionStatus);

export default router;
