import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import chatRoutes from './routes/chatRoutes';
import friendRoutes from './routes/friendRoutes';
import groupRoutes from './routes/groupRoutes';
import storyRoutes from './routes/storyRoutes';
import followRoutes from './routes/followRoutes';
import privacyRoutes from './controllers/privacyRoutes';
import prisma from './lib/prisma';
import { sendPushNotification } from './services/notificationService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/privacy', privacyRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('TimePass Backend Running');
});

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('joinGroupRooms', (groupIds: string[]) => {
        groupIds.forEach(id => socket.join(id));
        console.log(`User joined group rooms: ${groupIds}`);
    });

    // --- Typing Indicators ---
    socket.on('typing', (data: { senderId: string; receiverId?: string; groupId?: string; username: string; isTyping: boolean }) => {
        if (data.groupId) {
            socket.to(data.groupId).emit('userTyping', data);
        } else if (data.receiverId) {
            io.to(data.receiverId).emit('userTyping', data);
        }
    });

    socket.on('sendMessage', async (data: { senderId: string; receiverId?: string; groupId?: string; content: string }) => {
        try {
            if (data.groupId) {
                // Group Message logic
                const membership = await prisma.groupMember.findUnique({
                    where: { groupId_userId: { groupId: data.groupId, userId: data.senderId } }
                });

                if (!membership || membership.status !== 'ACCEPTED') {
                    io.to(data.senderId).emit('error', { message: 'You are not a member of this group' });
                    return;
                }

                const message = await prisma.message.create({
                    data: {
                        senderId: data.senderId,
                        groupId: data.groupId,
                        content: data.content
                    },
                    include: {
                        sender: { select: { id: true, username: true, avatar: true } }
                    }
                });

                io.to(data.groupId).emit('newGroupMessage', message);

                // Push notifications for group members
                const group = await prisma.group.findUnique({
                    where: { id: data.groupId },
                    select: { name: true }
                });

                const members = await prisma.groupMember.findMany({
                    where: {
                        groupId: data.groupId,
                        userId: { not: data.senderId },
                        status: 'ACCEPTED'
                    },
                    select: { userId: true }
                });

                members.forEach((member: { userId: string }) => {
                    sendPushNotification(
                        member.userId,
                        `${group?.name || 'New Group Message'}`,
                        `${message.sender.username}: ${data.content}`,
                        { type: 'GROUP_MESSAGE', groupId: data.groupId }
                    );
                });
                return;
            }

            if (!data.receiverId) return;

            // SECURITY: Check connections
            const connection = await prisma.friendRequest.findFirst({
                where: {
                    status: 'ACCEPTED',
                    OR: [
                        { senderId: data.senderId, receiverId: data.receiverId },
                        { senderId: data.receiverId, receiverId: data.senderId }
                    ]
                }
            });

            if (!connection) {
                console.log('Blocking message between non-friends:', data.senderId, data.receiverId);
                io.to(data.senderId).emit('error', { message: 'You must be friends to chat' });
                return;
            }

            // Check for blocks
            const isBlocked = await prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: data.senderId, blockedId: data.receiverId },
                        { blockerId: data.receiverId, blockedId: data.senderId }
                    ]
                }
            });

            if (isBlocked) {
                console.log('Blocking message due to block:', data.senderId, data.receiverId);
                io.to(data.senderId).emit('error', { message: 'Message blocked' });
                return;
            }

            const receiverRoom = io.sockets.adapter.rooms.get(data.receiverId);
            const isDelivered = !!(receiverRoom && receiverRoom.size > 0);

            const message = await prisma.message.create({
                data: {
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    content: data.content,
                    isDelivered: isDelivered,
                },
            });

            io.to(data.receiverId).emit('newMessage', message);
            io.to(data.senderId).emit('messageSent', message);

            if (isDelivered) {
                io.to(data.senderId).emit('messageStatusUpdate', {
                    messageId: message.id,
                    isDelivered: true,
                    isRead: false
                });
            } else {
                // Sender details for notification
                const sender = await prisma.user.findUnique({
                    where: { id: data.senderId },
                    select: { username: true }
                });

                sendPushNotification(
                    data.receiverId,
                    `New message from ${sender?.username || 'SocialChat'}`,
                    data.content,
                    { type: 'DIRECT_MESSAGE', senderId: data.senderId }
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    // --- Message Management (Edit/Delete) ---
    socket.on('editMessage', async (data: { messageId: string; senderId: string; content: string; receiverId?: string; groupId?: string }) => {
        try {
            const updated = await prisma.message.update({
                where: { id: data.messageId },
                data: { content: data.content, isEdited: true }
            });

            if (data.groupId) {
                io.to(data.groupId).emit('messageEdited', updated);
            } else if (data.receiverId) {
                io.to(data.receiverId).emit('messageEdited', updated);
                io.to(data.senderId).emit('messageEdited', updated);
            }
        } catch (error) {
            console.error('Error editing message:', error);
        }
    });

    socket.on('deleteMessage', async (data: { messageId: string; senderId: string; receiverId?: string; groupId?: string }) => {
        try {
            // Soft delete
            const deleted = await prisma.message.update({
                where: { id: data.messageId },
                data: { content: 'This message was deleted', isDeleted: true }
            });

            if (data.groupId) {
                io.to(data.groupId).emit('messageDeleted', { messageId: data.messageId });
            } else if (data.receiverId) {
                io.to(data.receiverId).emit('messageDeleted', { messageId: data.messageId });
                io.to(data.senderId).emit('messageDeleted', { messageId: data.messageId });
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    });

    socket.on('markAsRead', async (data: { messageId: string; senderId: string }) => {
        try {
            const message = await prisma.message.update({
                where: { id: data.messageId },
                data: { isRead: true },
            });
            io.to(data.senderId).emit('messageStatusUpdate', {
                messageId: message.id,
                isDelivered: true,
                isRead: true
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { io };
