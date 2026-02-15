import express from 'express';
import { reportItem, toggleBlock, getBlockedUsers } from './privacyController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/report', protect, reportItem);
router.post('/block', protect, toggleBlock);
router.get('/blocked', protect, getBlockedUsers);

export default router;
