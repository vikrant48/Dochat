import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
    createGroup,
    getMyGroups,
    getPendingInvites,
    respondToInvite,
    getGroupDetails,
    updateGroup,
    manageMember,
    searchGroups
} from '../controllers/groupController';

const router = express.Router();

router.use(protect);

router.get('/search', searchGroups);
router.post('/create', createGroup);
router.get('/my-groups', getMyGroups);
router.get('/invites', getPendingInvites);
router.post('/respond', respondToInvite);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.post('/manage-member', manageMember);

export default router;
