import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
    ,
    role: z.enum(['ADMINISTRATOR', 'EXAMINER']).optional()
});

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

// ─── Students ────────────────────────────────────────────────────────────────
export const createStudentSchema = z.object({
    indexNo: z.string().min(1, 'Index number is required'),
    lastname: z.string().min(1, 'Last name is required'),
    othernames: z.string().min(1, 'Other names are required'),
    programId: z.number().int().positive('Program ID must be valid'),
    cohortId: z.number().int().positive().optional().nullable(),
    level: z.string().optional()
});

export const updateStudentSchema = createStudentSchema.partial();

export const bulkStudentsSchema = z.object({
    students: z.array(z.object({
        indexNo: z.string().min(1),
        lastname: z.string().min(1),
        othernames: z.string().optional().default(''),
        programId: z.union([z.number().int().positive(), z.string().transform(v => parseInt(v))]),
        cohortId: z.number().int().positive().optional().nullable(),
    })).min(1, 'At least one student is required')
});

export const promoteStudentsSchema = z.object({
    studentIds: z.array(z.number().int().positive()).min(1, 'At least one student ID is required'),
    newLevel: z.string().min(1, 'New level is required')
});

// ─── Results ─────────────────────────────────────────────────────────────────
export const createResultSchema = z.object({
    studentId: z.number().int().positive(),
    examinerId: z.number().int().positive().nullable().optional(),
    examType: z.enum(['PRACTICAL', 'CARE_STUDY', 'CARE_PLAN', 'OBSTETRICIAN']),
    procedure: z.string().optional(),
    score: z.number().min(0).max(100),
    details: z.record(z.string(), z.any()).optional(),
    taskId: z.number().int().optional()
}).refine(data => {
    if (data.examType === 'CARE_PLAN' && data.score > 20) {
        return false;
    }
    return true;
}, {
    message: "Score for Care Plan cannot exceed 20",
    path: ["score"]
});

export const finalizeReconciliationSchema = z.object({
    selectedAssessorNumber: z.number().int().min(1).max(2).optional(),
    selectedProcedures: z.any().optional(),
    reconciliationNotes: z.string().optional()
});

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
    taskCode: z.string().min(1, 'Task code is required'),
    programId: z.number().int().positive('Program ID must be valid'),
    category: z.string().min(1, 'Category is required'),
    title: z.string().min(1, 'Title is required')
});

export const updateTaskSchema = createTaskSchema.partial();

// ─── Cohorts ─────────────────────────────────────────────────────────────────
export const createCohortSchema = z.object({
    name: z.string().min(1, 'Cohort name is required'),
    programId: z.number().int().positive('Program ID must be valid').optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable()
});

export const updateCohortSchema = createCohortSchema.partial();

// ─── Programs ────────────────────────────────────────────────────────────────
export const createProgramSchema = z.object({
    name: z.string().min(1, 'Program name is required'),
    shortName: z.string().min(1, 'Short name is required'),
    code: z.string().min(1, 'Code is required'),
    maxTasks: z.coerce.number().int().positive().optional(),
    status: z.enum(['ACTIVE', 'DORMANT']).optional()
});

export const updateProgramSchema = createProgramSchema.partial();

// ─── Users ───────────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['ADMINISTRATOR', 'EXAMINER']).optional()
});

export const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMINISTRATOR', 'EXAMINER']).optional(),
    password: z.string().min(8).optional()
});

// ─── Settings ────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional()
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(15, 'Password cannot exceed 15 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

export const updateSystemSettingsSchema = z.object({
    settings: z.record(z.string(), z.any())
});

export const factoryResetSchema = z.object({
    confirmationText: z.literal('RESET', { message: 'Confirmation text must be exactly "RESET"' }),
    wipeOptions: z.object({
        results: z.boolean().optional(),
        candidates: z.boolean().optional(),
        programs: z.boolean().optional(),
        tasks: z.boolean().optional(),
        examiners: z.boolean().optional(),
        users: z.boolean().optional()
    })
});

// ─── Assessment Types ────────────────────────────────────────────────────────
export const createAssessmentTypeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    examinerCount: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    programIds: z.array(z.number().int().positive()).optional()
});

export const updateAssessmentTypeSchema = createAssessmentTypeSchema.partial();

// ─── Analytics ───────────────────────────────────────────────────────────────
export const logEventsSchema = z.object({
    events: z.array(z.object({
        eventType: z.string().min(1),
        pageUrl: z.string().min(1),
        details: z.record(z.string(), z.any()).optional(),
        timestamp: z.string()
    })).min(1, 'At least one event is required')
});


