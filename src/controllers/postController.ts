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
        const posts = await prisma.post.findMany({
            include: {
                user: { select: { id: true, username: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
                likes: {
                    where: { userId },
                    select: { userId: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const postsWithLikedStatus = posts.map((post: any) => ({
            ...post,
            isLiked: post.likes.length > 0
        }));

        res.json(postsWithLikedStatus);
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
        res.json({ message: 'Post liked', isLiked: true });
    } catch (error) {
        console.error('Like Post Error:', error);
        res.status(500).json({ message: 'Error liking post', error });
    }
};

export const addComment = async (req: any, res: Response) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
        return res.status(400).json({ message: 'Comment content is required' });
    }

    try {
        const comment = await prisma.comment.create({
            data: {
                postId,
                userId,
                content
            },
            include: {
                user: { select: { username: true, avatar: true } }
            }
        });
        res.status(201).json(comment);
    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({ message: 'Error adding comment', error });
    }
};
