import { Response } from 'express';
import prisma from '../lib/prisma';

export const updateProfile = async (req: any, res: Response) => {
    const { username, avatar, bio } = req.body;
    const userId = req.user.id;

    try {
        // Check if username is taken by another user
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    id: { not: userId }
                }
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username || undefined,
                avatar: avatar || undefined,
                bio: bio !== undefined ? bio : undefined
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
                }
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Error updating profile', error });
    }
};

export const searchUsers = async (req: any, res: Response) => {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query) return res.json([]);

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query as string, mode: 'insensitive' } },
                    { email: { contains: query as string, mode: 'insensitive' } }
                ],
                id: { not: userId }
            },
            select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
                }
            },
            take: 20
        });

        res.json(users);
    } catch (error) {
        console.error('Search Users Error:', error);
        res.status(500).json({ message: 'Error searching users', error });
    }
};

export const getUserProfile = async (req: any, res: Response) => {
    const { userId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({ message: 'Error fetching user profile', error });
    }
};

export const updatePushToken = async (req: any, res: Response) => {
    const { pushToken } = req.body;
    const userId = req.user.id;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken }
        });
        res.json({ message: 'Push token updated' });
    } catch (error) {
        console.error('Update Push Token Error:', error);
        res.status(500).json({ message: 'Error updating push token', error });
    }
};
