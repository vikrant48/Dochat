import { Request, Response } from 'express';
import { prisma } from '../server';

export const getMessages = async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const otherUserId = req.params.otherUserId as string;

    try {
        // SECURITY: Check if they are accepted friends
        const connection = await prisma.friendRequest.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId }
                ]
            }
        });

        if (!connection) {
            return res.status(403).json({ message: 'You can only chat with accepted friends' });
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
            select: {
                id: true,
                content: true,
                senderId: true,
                receiverId: true,
                isDelivered: true,
                isRead: true,
                createdAt: true,
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

export const markBatchRead = async (req: Request, res: Response) => {
    const { messageIds } = req.body;
    try {
        await prisma.message.updateMany({
            where: { id: { in: messageIds } },
            data: { isRead: true, isDelivered: true },
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error marking messages as read', error });
    }
};

export const sendMessage = async (req: any, res: Response) => {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    try {
        // SECURITY: Check connections
        const connection = await prisma.friendRequest.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });

        if (!connection) {
            return res.status(403).json({ message: 'You can only send messages to accepted friends' });
        }

        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content,
            },
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ message: 'Error sending message', error });
    }
};
