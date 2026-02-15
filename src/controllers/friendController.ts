import { Response } from 'express';
import prisma from '../lib/prisma';
import { io } from '../server';

export const sendFriendRequest = async (req: any, res: Response) => {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
        return res.status(400).json({ message: 'You cannot send a request to yourself' });
    }

    try {
        // Check if request already exists
        const existingRequest = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'A request already exists between these users' });
        }

        const request = await prisma.friendRequest.create({
            data: {
                senderId,
                receiverId,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: { id: true, username: true, avatar: true }
                }
            }
        });

        // Notify receiver via socket
        io.to(receiverId).emit('newFriendRequest', request);

        res.status(201).json(request);
    } catch (error) {
        console.error('Send Friend Request Error:', error);
        res.status(500).json({ message: 'Error sending friend request', error });
    }
};

export const respondToRequest = async (req: any, res: Response) => {
    const { requestId, status } = req.body; // status: 'ACCEPTED' or 'REJECTED'
    const userId = req.user.id;

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const request = await prisma.friendRequest.findUnique({
            where: { id: requestId }
        });

        if (!request || request.receiverId !== userId) {
            return res.status(404).json({ message: 'Request not found or unauthorized' });
        }

        const updatedRequest = await prisma.friendRequest.update({
            where: { id: requestId },
            data: { status }
        });

        res.json(updatedRequest);
    } catch (error) {
        console.error('Respond to Request Error:', error);
        res.status(500).json({ message: 'Error responding to request', error });
    }
};

export const getFriendRequests = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const requests = await prisma.friendRequest.findMany({
            where: {
                receiverId: userId,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        res.json(requests);
    } catch (error) {
        console.error('Get Friend Requests Error:', error);
        res.status(500).json({ message: 'Error fetching friend requests', error });
    }
};

export const getFriends = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        // Find all accepted requests where the user is either sender or receiver
        const connections = await prisma.friendRequest.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: {
                    select: { id: true, username: true, avatar: true }
                },
                receiver: {
                    select: { id: true, username: true, avatar: true }
                }
            }
        });

        // Extract the friend's info
        const friends = connections.map((conn: any) => {
            return conn.senderId === userId ? conn.receiver : conn.sender;
        });

        res.json(friends);
    } catch (error) {
        console.error('Get Friends Error:', error);
        res.status(500).json({ message: 'Error fetching friends', error });
    }
};

export const getConnectionStatus = async (req: any, res: Response) => {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    try {
        const request = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId }
                ]
            }
        });

        if (!request) {
            return res.json({ status: 'NONE' });
        }

        // If I am the receiver and it's pending, tell UI I can accept
        if (request.status === 'PENDING' && request.receiverId === userId) {
            return res.json({ status: 'PENDING_RECEIVED', requestId: request.id });
        }

        return res.json({ status: request.status, requestId: request.id });
    } catch (error) {
        console.error('Get Connection Status Error:', error);
        res.status(500).json({ message: 'Error fetching connection status', error });
    }
};
