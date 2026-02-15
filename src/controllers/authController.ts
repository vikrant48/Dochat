import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import generateToken from '../utils/generateToken';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, avatar: true },
        });
        res.json(users);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ message: 'Error fetching users', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const registerUser = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        });

        res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            token: generateToken(user.id),
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.twoFactorEnabled) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                await prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorOTP: otp },
                });

                // In a real app, send email here. For now, we'll return it in the response (DEMO ONLY)
                console.log(`2FA OTP for ${user.email}: ${otp}`);

                return res.json({
                    require_2fa: true,
                    userId: user.id,
                    message: 'Two-factor authentication required',
                    otp_demo: otp // REMOVE THIS IN PRODUCTION
                });
            }

            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const verify2FA = async (req: Request, res: Response) => {
    const { userId, otp } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user && user.twoFactorOTP === otp) {
            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorOTP: null },
            });

            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Verify 2FA Error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const toggle2FA = async (req: Request, res: Response) => {
    const { enabled } = req.body;
    const userId = (req as any).user.id;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: enabled },
        });
        res.json({ message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, enabled });
    } catch (error) {
        console.error('Toggle 2FA Error:', error);
        res.status(500).json({ message: 'Error toggling 2FA', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
