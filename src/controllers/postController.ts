import { Response } from 'express';
import prisma from '../lib/prisma';

export const createPost = async (req: any, res: Response) => {
    const { caption } = req.body;
    const userId = req.user?.id;
    const images = req.files ? (req.files as any[]).map(f => f.location) : [];

    if (images.length === 0) {
        return res.status(400).json({ message: 'At least one image is required' });
    }

    try {
        const post = await prisma.post.create({
            data: {
                userId,
                images,
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
    const userId = req.user?.id;
    const { cursor, search } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const queryOptions: any = {
            take: limit + 1,
            where: search ? {
                OR: [
                    { caption: { contains: search as string, mode: 'insensitive' } },
                    { user: { username: { contains: search as string, mode: 'insensitive' } } },
                ]
            } : {},
            include: {
                user: { select: { id: true, username: true, avatar: true } },
                _count: { select: { likes: true, comments: true } },
                likes: {
                    where: { userId },
                    select: { userId: true }
                },
                comments: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { username: true, avatar: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1;
        }

        const posts = await prisma.post.findMany(queryOptions);

        const hasMore = posts.length > limit;
        const data = hasMore ? posts.slice(0, limit) : posts;

        let nextCursor = null;
        if (hasMore && data.length > 0) {
            const lastItem = data[data.length - 1];
            if (lastItem) nextCursor = lastItem.id;
        }

        const postsWithLikedStatus = data.map((post: any) => ({
            ...post,
            isLiked: post.likes.length > 0
        }));

        res.json({
            posts: postsWithLikedStatus,
            nextCursor,
            hasMore
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error });
    }
};

export const likePost = async (req: any, res: Response) => {
    const { postId } = req.params;
    const userId = req.user?.id;

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
    const userId = req.user?.id;

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
