import api from '../lib/api';

export type ExamType = 'PRACTICAL' | 'CARE_STUDY' | 'CARE_PLAN' | 'OBSTETRICIAN';

export interface ExamResult {
    id: number;
    studentId: number;
    examinerId?: number;
    examType: ExamType;
    taskId?: number;
    caseTitle?: string;
    diagnosis?: string;
    procedure?: string;
    score: number;
    details?: Record<string, unknown>;
    academicYear?: string;
    studentLevel?: string;
    createdAt: string;
    student?: {
        id: number;
        indexNo: string;
        lastname: string;
        othernames: string;
        level?: string;
        programId?: number;
        program?: {
            id: number;        // ← added: removes all `as any` casts in Downloads
            name: string;
            code: string;
            maxTasks?: number;
        };
    };
    examiner?: {
        id: number;
        name: string;
        username: string;
        email?: string;
    };
    task?: {
        id: number;
        title: string;
        category: string;
        taskCode: string;
        procedures?: {
            id: number;
            stepNumber: number;
            description: string;
            maxMarks: number;
        }[];
    };
    creator?: {
        id: number;
        name: string;
        username: string;
    };
    reconciledByCreator?: {
        id: number;
        name: string;
    };
    // Dual examiner fields
    assessorNumber?: number;
    reconciliationId?: string;
    isFinalSubmission?: boolean;
    finalSubmittedBy?: number;
    reconciliationNotes?: string;
}

export interface SubmitPracticalResult {
    studentId: number;
    examinerId?: number;
    taskId?: number;
    score: number;
    examType?: 'PRACTICAL';
    details?: Record<string, any>;
}

export interface SubmitCareStudyResult {
    studentId: number;
    examinerId?: number;
    caseTitle: string;
    score: number;
    details?: Record<string, any>;
}

export interface SubmitCarePlanResult {
    studentId: number;
    examinerId?: number;
    diagnosis: string;
    score: number;
    details?: Record<string, any>;
}

export interface SubmitObstetricianResult {
    studentId: number;
    examinerId?: number;
    procedure: string;
    score: number;
    details?: Record<string, any>;
}

export interface TaskStatus {
    taskId: number;
    taskTitle: string;
    status: 'in_progress' | 'pending_reconciliation' | 'finalized';
    assessmentCount: number;
    assessors: string[];
    reconciliationId?: string;
    isFinal: boolean;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const resultsService = {
    async getAll(filters?: { examType?: ExamType; studentId?: number; includeAll?: boolean; page?: number; limit?: number }): Promise<{ results: ExamResult[]; pagination?: PaginationMeta }> {
        const response = await api.get('/results', { params: filters });
        return response.data;
    },

    async getById(id: number): Promise<ExamResult> {
        const response = await api.get(`/results/${id}`);
        return response.data.result;
    },

    async submitPractical(data: SubmitPracticalResult): Promise<ExamResult> {
        const response = await api.post('/results/practical', data);
        return response.data.result;
    },

    // Dual examiner methods
    async submitDualPractical(data: SubmitPracticalResult): Promise<{ result: ExamResult; needsReconciliation: boolean; assessments?: ExamResult[] }> {
        const response = await api.post('/results/practical/dual', data);
        return response.data;
    },

    async getReconciliation(reconciliationId: string): Promise<ExamResult[]> {
        const response = await api.get(`/results/reconciliation/${reconciliationId}`);
        return response.data.assessments;
    },

    async resetReconciliation(reconciliationId: string): Promise<{ message: string }> {
        const response = await api.post(`/results/reconciliation/${reconciliationId}/reset`);
        return response.data;
    },

    async submitFinalResult(reconciliationId: string, selectedAssessorNumber: number, reconciliationNotes?: string): Promise<ExamResult> {
        const response = await api.post(`/results/reconciliation/${reconciliationId}/finalize`, {
            selectedAssessorNumber,
            reconciliationNotes
        });
        return response.data.result;
    },

    async submitPracticalFinalResult(reconciliationId: string, selectedProcedures: Record<number, number>, reconciliationNotes?: string): Promise<ExamResult> {
        const response = await api.post(`/results/reconciliation/${reconciliationId}/finalize-practical`, {
            selectedProcedures,
            reconciliationNotes
        });
        return response.data.result;
    },

    async getPendingReconciliations(): Promise<{
        reconciliationId: string;
        student: Pick<NonNullable<ExamResult['student']>, 'id' | 'indexNo' | 'lastname' | 'othernames'>;
        task: Pick<NonNullable<ExamResult['task']>, 'id' | 'title' | 'taskCode'>;
        assessments: ExamResult[];
    }[]> {
        const response = await api.get('/results/pending-reconciliations');
        return response.data.pending;
    },

    async submitCareStudy(data: SubmitCareStudyResult): Promise<ExamResult> {
        const response = await api.post('/results/care-study', data);
        return response.data.result;
    },

    async submitCarePlan(data: SubmitCarePlanResult): Promise<ExamResult> {
        const response = await api.post('/results/care-plan', data);
        return response.data.result;
    },

    async submitObstetrician(data: SubmitObstetricianResult): Promise<ExamResult> {
        const response = await api.post('/results/obstetrician', data);
        return response.data.result;
    },

    async getStudentTaskStatus(studentId: number): Promise<TaskStatus[]> {
        const response = await api.get(`/results/student/${studentId}/task-status`);
        return response.data.taskStatus;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/results/${id}`);
    }
};
