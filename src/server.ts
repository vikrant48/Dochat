import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import chatRoutes from './routes/chatRoutes';
import friendRoutes from './routes/friendRoutes';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const prisma = new PrismaClient();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/friends', friendRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('SocialChat Backend Running');
});

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('sendMessage', async (data: { senderId: string; receiverId: string; content: string }) => {
        try {
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
                // Optionally notify sender they can't message this person
                io.to(data.senderId).emit('error', { message: 'You must be friends to chat' });
                return;
            }

            // Check if receiver is online/connected to their room
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

            // Emit to receiver's room
            io.to(data.receiverId).emit('newMessage', message);
            // Emit back to sender
            io.to(data.senderId).emit('messageSent', message);

            if (isDelivered) {
                // If delivered instantly, notify sender
                io.to(data.senderId).emit('messageStatusUpdate', {
                    messageId: message.id,
                    isDelivered: true,
                    isRead: false
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('markAsRead', async (data: { messageId: string; senderId: string }) => {
        try {
            const message = await prisma.message.update({
                where: { id: data.messageId },
                data: { isRead: true },
            });
            // Notify the original sender that their message was read
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

export { prisma, io };
