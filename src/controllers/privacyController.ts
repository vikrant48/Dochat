import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const reportItem = async (req: Request, res: Response) => {
    const { targetId, reason, type } = req.body; // type: 'POST' or 'USER'
    const reporterId = (req as any).user.id;

    try {
        const report = await prisma.report.create({
            data: {
                reporterId,
                targetId,
                reason,
                type,
            },
        });
        res.status(201).json({ message: 'Report submitted successfully', report });
    } catch (error) {
        console.error('Report Item Error:', error);
        res.status(500).json({ message: 'Error submitting report', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const toggleBlock = async (req: Request, res: Response) => {
    const { blockedId } = req.body;
    const blockerId = (req as any).user.id;

    try {
        const existingBlock = await prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });

        if (existingBlock) {
            await prisma.block.delete({
                where: { id: existingBlock.id },
            });
            return res.json({ message: 'User unblocked', isBlocked: false });
        } else {
            await prisma.block.create({
                data: {
                    blockerId,
                    blockedId,
                },
            });
            return res.json({ message: 'User blocked', isBlocked: true });
        }
    } catch (error) {
        console.error('Toggle Block Error:', error);
        res.status(500).json({ message: 'Error toggling block', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const getBlockedUsers = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
        const blocks = await prisma.block.findMany({
            where: { blockerId: userId },
            include: {
                blocked: {
                    select: { id: true, username: true, avatar: true },
                },
            },
        });
        res.json(blocks.map((b: any) => b.blocked));
    } catch (error) {
        console.error('Get Blocked Users Error:', error);
        res.status(500).json({ message: 'Error fetching blocked users', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
