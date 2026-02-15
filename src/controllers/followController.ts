import { Response } from 'express';
import prisma from '../lib/prisma';

export const toggleFollow = async (req: any, res: Response) => {
    const { userId: followingId } = req.params;
    const followerId = req.user?.id;

    if (followerId === followingId) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
        const existingFollow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: { followerId, followingId }
            }
        });

        if (existingFollow) {
            await prisma.follows.delete({
                where: {
                    followerId_followingId: { followerId, followingId }
                }
            });
            return res.json({ message: 'Unfollowed user', isFollowing: false });
        }

        await prisma.follows.create({
            data: { followerId, followingId }
        });
        res.json({ message: 'Followed user', isFollowing: true });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling follow', error });
    }
};

export const getFollowStatus = async (req: any, res: Response) => {
    const { userId: followingId } = req.params;
    const followerId = req.user?.id;

    try {
        const follow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: { followerId, followingId }
            }
        });
        res.json({ isFollowing: !!follow });
    } catch (error) {
        res.status(500).json({ message: 'Error checking follow status', error });
    }
};
