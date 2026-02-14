import { Request, Response } from 'express';
import { prisma } from '../server';

export const getMessages = async (req: Request, res: Response) => {
    const { userId, otherUserId } = req.params;

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error });
    }
};
