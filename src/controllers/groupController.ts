import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { io } from '../server';

export const createGroup = async (req: any, res: Response) => {
    const { name, description, memberIds } = req.body;
    const adminId = req.user.id;

    try {
        const group = await prisma.group.create({
            data: {
                name,
                description,
                adminId,
                members: {
                    create: {
                        userId: adminId,
                        status: 'ACCEPTED',
                        isAdmin: true
                    }
                }
            }
        });

        // Add other members as PENDING
        if (memberIds && memberIds.length > 0) {
            await prisma.groupMember.createMany({
                data: memberIds.map((userId: string) => ({
                    groupId: group.id,
                    userId,
                    status: 'PENDING',
                    isAdmin: false
                }))
            });

            // Notify members via socket
            memberIds.forEach((userId: string) => {
                io.to(userId).emit('groupInvitation', {
                    groupId: group.id,
                    groupName: group.name,
                    invitedBy: req.user.username
                });
            });
        }

        res.status(201).json(group);
    } catch (error) {
        console.error('Create Group Error:', error);
        res.status(500).json({ message: 'Error creating group', error });
    }
};

export const getMyGroups = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const memberships = await prisma.groupMember.findMany({
            where: { userId, status: 'ACCEPTED' },
            include: {
                group: {
                    include: {
                        _count: { select: { members: true } }
                    }
                }
            }
        });

        res.json(memberships.map((m: any) => m.group));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups', error });
    }
};

export const getPendingInvites = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const invites = await prisma.groupMember.findMany({
            where: { userId, status: 'PENDING' },
            include: {
                group: true
            }
        });

        res.json(invites);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invites', error });
    }
};

export const respondToInvite = async (req: any, res: Response) => {
    const { groupId, status } = req.body; // ACCEPTED or REJECTED
    const userId = req.user.id;

    try {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } }
        });

        if (!membership) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (status === 'REJECTED') {
            await prisma.groupMember.delete({
                where: { id: membership.id }
            });
            return res.json({ message: 'Invitation rejected' });
        }

        const updated = await prisma.groupMember.update({
            where: { id: membership.id },
            data: { status: 'ACCEPTED' }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error responding to invite', error });
    }
};

export const getGroupDetails = async (req: any, res: Response) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, username: true, avatar: true } }
                    }
                }
            }
        });

        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some((m: any) => m.userId === userId && m.status === 'ACCEPTED');
        if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group details', error });
    }
};

export const updateGroup = async (req: any, res: Response) => {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    try {
        const member = await prisma.groupMember.findFirst({
            where: { groupId, userId, isAdmin: true }
        });

        if (!member) return res.status(403).json({ message: 'Only admins can update group' });

        const group = await prisma.group.update({
            where: { id: groupId },
            data: { name, description }
        });

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Error updating group', error });
    }
};

export const manageMember = async (req: any, res: Response) => {
    const { groupId, userId, action } = req.body; // action: 'REMOVE' or 'MAKE_ADMIN'
    const adminId = req.user.id;

    try {
        const admin = await prisma.groupMember.findFirst({
            where: { groupId, userId: adminId, isAdmin: true }
        });

        if (!admin) return res.status(403).json({ message: 'Only admins can manage members' });

        if (action === 'REMOVE') {
            await prisma.groupMember.delete({
                where: { groupId_userId: { groupId, userId } }
            });
            return res.json({ message: 'Member removed' });
        }

        if (action === 'MAKE_ADMIN') {
            await prisma.groupMember.update({
                where: { groupId_userId: { groupId, userId } },
                data: { isAdmin: true }
            });
            return res.json({ message: 'Member promoted to admin' });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        res.status(500).json({ message: 'Error managing member', error });
    }
};
