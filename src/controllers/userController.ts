import { Response } from 'express';
import prisma from '../lib/prisma';

export const updateProfile = async (req: any, res: Response) => {
    const { username, avatar } = req.body;
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
                avatar: avatar || undefined
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Error updating profile', error });
    }
};
