import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import prisma from '../lib/prisma';

let expo = new Expo();

export const sendPushNotification = async (userId: string, title: string, body: string, data?: any) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { pushToken: true }
        });

        if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
            console.log(`User ${userId} has no valid push token.`);
            return;
        }

        const messages: ExpoPushMessage[] = [{
            to: user.pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];

        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending notification chunk:', error);
            }
        }

        // Notification sent successfully

    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};
