import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/audit.service';

/** Hash a token with SHA-256 for safe storage */
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, username, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existingUser) {
            res.status(400).json({ error: 'Username or email already exists' });
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                username,
                email,
                passwordHash,
                role: role || 'EXAMINER',
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.passwordHash);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            username: user.username,
            role: user.role,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        res.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                forcePasswordChange: user.forcePasswordChange,
            },
            accessToken,
            refreshToken,
        });

        // Audit log for login (fire-and-forget)
        auditService.createLog({
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            details: { username: user.username, role: user.role },
            ipAddress: req.ip || req.socket.remoteAddress
        }).catch(() => { });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            res.status(400).json({ error: 'Refresh token required' });
            return;
        }

        // Check if this token has been revoked
        const tokenHash = hashToken(token);
        const revoked = await prisma.revokedToken.findUnique({
            where: { tokenHash },
        });

        if (revoked) {
            res.status(401).json({ error: 'Token has been revoked' });
            return;
        }

        // Verify refresh token
        const payload = verifyRefreshToken(token);

        // Generate new access token
        const accessToken = generateAccessToken({
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
        });

        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            const tokenHash = hashToken(token);

            // Decode token to get its expiry for cleanup scheduling
            let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days
            try {
                const payload = verifyRefreshToken(token);
                if ((payload as any).exp) {
                    expiresAt = new Date((payload as any).exp * 1000);
                }
            } catch {
                // Token may already be expired — still blacklist it for safety
            }

            // Upsert to avoid unique constraint errors on double-logout
            await prisma.revokedToken.upsert({
                where: { tokenHash },
                update: {},
                create: { tokenHash, expiresAt },
            });
        }

        // Clean up expired revoked tokens periodically (1% chance per logout)
        if (Math.random() < 0.01) {
            prisma.revokedToken.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            }).catch(() => { }); // Fire and forget
        }

        // Audit log for logout
        if (req.user) {
            auditService.createLog({
                userId: req.user.userId,
                action: 'LOGOUT',
                entity: 'User',
                entityId: req.user.userId,
                details: { username: req.user.username },
                ipAddress: req.ip || req.socket.remoteAddress
            }).catch(() => { });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                createdAt: true,
                forcePasswordChange: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};
