import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getCache, setCache, clearCache } from '../utils/redis';

const PROGRAMS_CACHE_KEY = 'APP:ACTIVE_PROGRAMS';

export const getAllPrograms = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        // Cache key includes pagination
        const cacheKey = `${PROGRAMS_CACHE_KEY}_PAGE_${page}_LIMIT_${limit}`;

        // 1. Check Cache
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            res.json(cachedData); // Return the entire cached object { data, pagination }
            return;
        }

        // 2. Cache Miss: Fetch from DB with count
        const skip = (page - 1) * limit;

        const [programs, total] = await Promise.all([
            prisma.program.findMany({
                orderBy: { name: 'asc' },
                include: {
                    assessmentTypeLinks: {
                        include: { assessmentType: true }
                    }
                },
                skip,
                take: limit,
            }),
            prisma.program.count()
        ]);

        // Add 'sn' (serial number) for frontend display
        const formattedPrograms = programs.map((p, index) => ({
            ...p,
            sn: skip + index + 1,
        }));

        const responsePayload = {
            data: formattedPrograms,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

        // 3. Set Cache (TTL 1 hour)
        await setCache(cacheKey, responsePayload, 3600);

        res.json(responsePayload);
    } catch (error) {
        console.error('Get programs error:', error);
        res.status(500).json({ error: 'Failed to get programs' });
    }
};

export const createProgram = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, shortName, code, status, maxTasks, maxCarePlans, assessmentTypeIds } = req.body;

        const existing = await prisma.program.findUnique({
            where: { code },
        });

        if (existing) {
            res.status(400).json({ error: 'Program with this code already exists' });
            return;
        }

        const program = await prisma.program.create({
            data: {
                name,
                shortName,
                code: code.toUpperCase(),
                status: status || 'ACTIVE',
                maxTasks: maxTasks ? parseInt(maxTasks) : 1,
                maxCarePlans: maxCarePlans ? parseInt(maxCarePlans) : 1,
                ...(assessmentTypeIds && assessmentTypeIds.length > 0 ? {
                    assessmentTypeLinks: {
                        create: assessmentTypeIds.map((id: number) => ({
                            assessmentTypeId: id
                        }))
                    }
                } : {})
            },
            include: {
                assessmentTypeLinks: { include: { assessmentType: true } }
            }
        });

        // Invalidate Cache
        await clearCache(PROGRAMS_CACHE_KEY);

        res.status(201).json({ program });
    } catch (error) {
        console.error('Create program error:', error);
        res.status(500).json({ error: 'Failed to create program' });
    }
};

export const updateProgram = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, shortName, code, status, maxTasks, maxCarePlans, assessmentTypeIds } = req.body;
        const programId = parseInt(id as string);

        if (assessmentTypeIds && Array.isArray(assessmentTypeIds)) {
            await prisma.assessmentTypeProgram.deleteMany({
                where: { programId }
            });
        }

        const program = await prisma.program.update({
            where: { id: programId },
            data: {
                name,
                shortName,
                code: code ? code.toUpperCase() : undefined,
                status: status || undefined, // Use status directly, or undefined if not provided
                maxTasks: maxTasks != null ? parseInt(maxTasks) : undefined,
                maxCarePlans: maxCarePlans != null ? parseInt(maxCarePlans) : undefined,
                ...(assessmentTypeIds && Array.isArray(assessmentTypeIds) ? {
                    assessmentTypeLinks: {
                        create: assessmentTypeIds.map((typeId: number) => ({
                            assessmentTypeId: typeId
                        }))
                    }
                } : {})
            },
            include: {
                assessmentTypeLinks: { include: { assessmentType: true } }
            }
        });

        // Invalidate Cache
        await clearCache(PROGRAMS_CACHE_KEY);

        res.json({ program });
    } catch (error) {
        console.error('Update program error:', error);
        res.status(500).json({ error: 'Failed to update program' });
    }
};

export const deleteProgram = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.program.delete({
            where: { id: parseInt(id as string) },
        });

        // Invalidate Cache
        await clearCache(PROGRAMS_CACHE_KEY);

        res.json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Delete program error:', error);
        res.status(500).json({ error: 'Failed to delete program' });
    }
};
