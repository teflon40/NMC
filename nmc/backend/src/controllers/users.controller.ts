import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [total, users] = await prisma.$transaction([
            prisma.user.count(),
            prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    // Exclude passwordHash
                },
                orderBy: {
                    name: 'asc',
                },
                skip,
                take: limit,
            })
        ]);

        res.json({
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, username, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email },
                ],
            },
        });

        if (existingUser) {
            res.status(400).json({ error: 'Username or email already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                username,
                email,
                passwordHash: hashedPassword,
                role: role === 'Administrator' ? 'ADMINISTRATOR' : 'EXAMINER',
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, username, email, role, password } = req.body;

        const updateData: {
            name?: string;
            username?: string;
            email?: string;
            role?: 'ADMINISTRATOR' | 'EXAMINER';
            passwordHash?: string;
        } = {
            name,
            username,
            email,
            role: role === 'Administrator' ? 'ADMINISTRATOR' : 'EXAMINER',
        };

        // Only update password if provided
        if (password && password.trim() !== '') {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id as string) },
            data: updateData,
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
            },
        });

        res.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Prevent deleting self? (Optional safety check)
        // if (req.user?.userId === parseInt(id)) { ... }

        await prisma.user.delete({
            where: { id: parseInt(id as string) },
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

export const bulkDeleteUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;
        const currentUserId = req.user?.userId;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Requires an array of User IDs.' });
            return;
        }

        const numIds = ids.map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => id !== currentUserId);

        if (numIds.length === 0) {
            res.status(400).json({ error: 'Cannot delete your own active session account.' });
            return;
        }

        const result = await prisma.user.deleteMany({
            where: {
                id: { in: numIds }
            }
        });

        res.json({ message: `Successfully deleted ${result.count} users`, count: result.count });
    } catch (error) {
        console.error('Delete multiple users error:', error);
        res.status(500).json({ error: 'Failed to rapidly delete selected users' });
    }
};
