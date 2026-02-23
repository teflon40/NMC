import { Request, Response } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { auditService } from '../services/audit.service';
import { getCache, setCache, clearCache } from '../utils/redis';
import { heavyOpsQueue } from '../queues/worker';

const SETTINGS_CACHE_KEY = 'APP:SETTINGS';

export const settingsController = {
    // Get current user profile
    async getProfile(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user });
            return;
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    },

    // Update user profile
    async updateProfile(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { name, email } = req.body;

            // Validate input
            if (!name || !email) {
                res.status(400).json({ error: 'Name and email are required' });
                return;
            }

            // Check if email is already taken by another user
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId }
                }
            });

            if (existingUser) {
                res.status(400).json({ error: 'Email already in use' });
                return;
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { name, email },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true
                }
            });

            // Log the action
            await auditService.createLog({
                userId,
                action: 'UPDATE_PROFILE',
                entity: 'User',
                entityId: userId,
                details: { name, email },
                ipAddress: req.ip || req.socket.remoteAddress
            });

            res.json({ user: updatedUser, message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    },

    // Change password
    async changePassword(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { oldPassword, newPassword } = req.body;

            // Validate input
            if (!oldPassword || !newPassword) {
                res.status(400).json({ error: 'Old password and new password are required' });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({ error: 'New password must be at least 6 characters' });
                return;
            }

            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Verify old password
            const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash, forcePasswordChange: false }
            });

            // Log the action
            await auditService.createLog({
                userId,
                action: 'CHANGE_PASSWORD',
                entity: 'User',
                entityId: userId,
                ipAddress: req.ip || req.socket.remoteAddress
            });

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    },

    // Get system settings
    async getSystemSettings(_req: Request, res: Response) {
        try {
            // 1. Check Cache
            const cachedSettings = await getCache(SETTINGS_CACHE_KEY);
            if (cachedSettings) {
                res.json(cachedSettings);
                return;
            }

            // 2. Cache Miss: Fetch from DB
            const settings = await prisma.systemSetting.findMany();
            // Convert array to object for easier frontend consumption
            const settingsMap = settings.reduce((acc: any, setting: any) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});

            // 3. Set Cache (TTL 1 hour)
            await setCache(SETTINGS_CACHE_KEY, settingsMap, 3600);

            res.json(settingsMap);
        } catch (error) {
            console.error('Get system settings error:', error);
            res.status(500).json({ error: 'Failed to get system settings' });
        }
    },

    // Update system settings
    async updateSystemSettings(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const settings = req.body; // Expect object { SCHOOL_NAME: "...", ... }

            // Upsert each setting
            const promises = Object.entries(settings).map(([key, value]) => {
                return prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                });
            });

            await Promise.all(promises);

            // Invalidate Cache since settings changed
            await clearCache(SETTINGS_CACHE_KEY);

            // Log action
            await auditService.createLog({
                userId,
                action: 'UPDATE_SYSTEM_SETTINGS',
                entity: 'SystemSetting',
                details: settings
            });

            res.json({ message: 'System settings updated successfully' });
        } catch (error) {
            console.error('Update system settings error:', error);
            res.status(500).json({ error: 'Failed to update system settings' });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // Factory Reset - DANGER ZONE
    // ─────────────────────────────────────────────────────────────────────────────
    async factoryReset(req: Request, res: Response) {
        try {
            const currentUserId = (req as any).user.userId;
            const { confirmationText, wipeOptions } = req.body;

            // Failsafe safety string check
            if (confirmationText !== 'RESET') {
                res.status(400).json({ error: 'Invalid confirmation text. Must be exactly "RESET".' });
                return;
            }

            // Enqueue the heavy wipe transaction instead of holding up the HTTP response
            const job = await heavyOpsQueue.add('selectiveWipe', { wipeOptions, currentUserId });

            // Log action immediately
            await auditService.createLog({
                userId: currentUserId,
                action: 'FACTORY_RESET_INITIATED',
                entity: 'SystemSetting',
                details: { confirmationText, wipeOptions, jobId: job.id },
                ipAddress: req.ip || req.socket.remoteAddress
            });

            res.status(202).json({ jobId: job.id, message: 'Data wipe initiated successfully in the background.' });
            return;

            // Log the selective wipe under the surviving admin
            await auditService.createLog({
                userId: currentUserId,
                action: 'FACTORY_RESET',
                entity: 'System',
                details: { event: 'Selective wipe executed', options: wipeOptions },
                ipAddress: req.ip || req.socket.remoteAddress
            });

            res.json({ message: 'Selective wipe completed successfully.' });

        } catch (error) {
            console.error('Factory Reset error:', error);
            res.status(500).json({ error: 'Critical failure during factory reset sequence.' });
        }
    }
};
