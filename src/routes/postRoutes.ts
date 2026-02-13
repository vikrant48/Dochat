import express from 'express';
import { createPost, getFeed, likePost } from '../controllers/postController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, createPost);
router.get('/feed', protect, getFeed);
router.post('/:postId/like', protect, likePost);

export default router;
