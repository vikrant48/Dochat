import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface DecodedToken {
    id: string;
}

export const protect = async (req: any, res: Response, Next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'secret'
            ) as DecodedToken;

            req.user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, username: true, email: true },
            });

            Next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
