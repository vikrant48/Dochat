import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getMessages = async (req: any, res: Response) => {
    const { userId, otherUserId } = req.params;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

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

        const queryOptions: any = {
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
            take: limit + 1,
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
                createdAt: 'desc',
            },
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1;
        }

        const messages = await prisma.message.findMany(queryOptions);

        const hasMore = messages.length > limit;
        const data = hasMore ? messages.slice(0, limit) : messages;

        let nextCursor = null;
        if (hasMore && data.length > 0) {
            const lastItem = data[data.length - 1];
            if (lastItem) nextCursor = lastItem.id;
        }

        res.json({
            messages: [...data].reverse(),
            nextCursor,
            hasMore
        });
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
    const { receiverId, content, groupId } = req.body;
    const senderId = req.user?.id;

    try {
        if (receiverId) {
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
        } else if (groupId) {
            const membership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId: senderId } }
            });

            if (!membership || membership.status !== 'ACCEPTED') {
                return res.status(403).json({ message: 'You must be a member of this group to send messages' });
            }
        } else {
            return res.status(400).json({ message: 'ReceiverId or GroupId is required' });
        }

        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId: receiverId || null,
                groupId: groupId || null,
                content,
            },
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ message: 'Error sending message', error });
    }
};

export const getGroupMessages = async (req: any, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user?.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    try {
        const getCharCodes = (s: string) => s.split('').map(c => c.charCodeAt(0)).join(',');


        const membership = await prisma.groupMember.findFirst({
            where: { groupId, userId }
        });




        if (!membership || membership.status !== 'ACCEPTED') {
            console.warn(`[DENIED] User ${userId} requested messages for group ${groupId}. Membership:`, membership);
            return res.status(403).json({ message: 'You must be a member of this group' });
        }

        const queryOptions: any = {
            where: { groupId },
            take: limit + 1,
            include: {
                sender: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1;
        }

        const messages = await prisma.message.findMany(queryOptions);

        const hasMore = messages.length > limit;
        const data = hasMore ? messages.slice(0, limit) : messages;

        let nextCursor = null;
        if (hasMore && data.length > 0) {
            const lastItem = data[data.length - 1];
            if (lastItem) nextCursor = lastItem.id;
        }

        res.json({
            messages: [...data].reverse(),
            nextCursor,
            hasMore
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group messages', error });
    }
};
