import { Response } from 'express';
import prisma from '../lib/prisma';

export const createStory = async (req: any, res: Response) => {
    const userId = req.user?.id;
    const imageUrl = req.file?.location; // URL from S3

    if (!imageUrl) {
        return res.status(400).json({ message: 'Story image is required' });
    }

    try {
        const story = await prisma.story.create({
            data: {
                userId,
                imageUrl,
            },
            include: { user: { select: { username: true, avatar: true } } },
        });
        res.status(201).json(story);
    } catch (error) {
        res.status(500).json({ message: 'Error creating story', error });
    }
};

export const getStories = async (req: any, res: Response) => {
    const userId = req.user?.id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Fetch stories from the user and their accepted friends
        const friendRequests = await prisma.friendRequest.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            }
        });

        const friendIds = friendRequests.map((fr: any) =>
            fr.senderId === userId ? fr.receiverId : fr.senderId
        );

        const stories = await prisma.story.findMany({
            where: {
                userId: { in: [userId, ...friendIds] },
                createdAt: { gte: twentyFourHoursAgo }
            },
            include: { user: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stories', error });
    }
};
