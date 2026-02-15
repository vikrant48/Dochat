import express from 'express';
import { toggleFollow, getFollowStatus } from '../controllers/followController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/:userId', protect, toggleFollow);
router.get('/:userId/status', protect, getFollowStatus);

export default router;
