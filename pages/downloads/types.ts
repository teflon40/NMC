// Shared types for Downloads sub-components

export type ExamResultWithMeta = {
    id: number;
    examType: string;
    taskId?: number;
    caseTitle?: string;
    diagnosis?: string;
    procedure?: string;
    score: number;
    details?: Record<string, unknown>;
    createdAt: string;
    reconciliationId?: string;
    isFinalSubmission?: boolean;
    reconciliationNotes?: string;
    taskLabel?: string;
    taskTitle?: string;
    examinerName?: string;
    examinerEmail?: string;
    academicYear?: string;
    studentLevel?: string;
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
};

export interface GroupedCarePlanResult {
    id: number;
    resultIds: number[];
    indexNo: string;
    lastname: string;
    othernames: string;
    name: string;
    program: string;
    taskScores: string[];
    totalScore: number;
    scoredBy: string;
    scores?: number;
    taskTitle?: string;
    creator?: { id: number; name: string; username: string };
    reconciledByCreator?: { id: number; name: string };
}

export interface TopicScore {
    title: string;
    score: number;    // weighted score (e.g. 36.4 out of 40)
    maxScore?: number; // e.g. 40 or 50 depending on eligibility
}

export interface GroupedPracticalResult {
    id: number;
    resultIds: number[];
    indexNo: string;
    lastname: string;
    othernames: string;
    name: string;
    program: string;
    programId: number | null;
    maxTasks?: number;
    maxCarePlans?: number;
    currentLevel: string;
    cpTopics: TopicScore[];
    cpTotalScore: number;
    pracTasks: TopicScore[];
    pracRawScores: number[];   // raw 0-100 scores per task, for weight recalculation
    pracTotalScore: number;
    scoredBy: string | null;
    results: ExamResultWithMeta[];
}

export interface GroupedStudentResult {
    studentId: number;
    indexNo: string;
    name: string;
    program: string;
    currentLevel: string;
    count: number;
    avgScore: number;
    examType: string;
    results: ExamResultWithMeta[];
}

export interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}
