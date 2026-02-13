import { Response } from 'express';
import { prisma } from '../server';

export const createPost = async (req: any, res: Response) => {
    const { imageUrl, caption } = req.body;
    const userId = req.user.id;

    try {
        const post = await prisma.post.create({
            data: {
                userId,
                imageUrl,
                caption,
            },
            include: { user: { select: { username: true, avatar: true } } },
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error creating post', error });
    }
};

export const getFeed = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        // For now, get all posts (in a real app, we would get posts from followed users)
        const posts = await prisma.post.findMany({
            include: {
                user: { select: { username: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error });
    }
};

export const likePost = async (req: any, res: Response) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const existingLike = await prisma.like.findUnique({
            where: { postId_userId: { postId, userId } },
        });

        if (existingLike) {
            await prisma.like.delete({
                where: { postId_userId: { postId, userId } },
            });
            return res.json({ message: 'Post unliked' });
        }

        await prisma.like.create({
            data: { postId, userId },
        });
        res.json({ message: 'Post liked' });
    } catch (error) {
        res.status(500).json({ message: 'Error liking post', error });
    }
};
