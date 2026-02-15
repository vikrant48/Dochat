import express from 'express';
import { createStory, getStories } from '../controllers/storyController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post('/', protect, upload.single('image'), createStory);
router.get('/', protect, getStories);

export default router;
