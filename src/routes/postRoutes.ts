import express from 'express';
import { createPost, getFeed, likePost, addComment } from '../controllers/postController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post('/', protect, upload.single('image'), createPost);
router.get('/feed', protect, getFeed);
router.post('/:postId/like', protect, likePost);
router.post('/:postId/comment', protect, addComment);

export default router;
