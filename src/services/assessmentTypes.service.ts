import api from '../lib/api';

export interface AssessmentTypeProgram {
    id: number;
    programId: number;
    assessmentTypeId: number;
    program: { id: number; name: string; code: string };
}

export interface AssessmentType {
    id: number;
    name: string;
    code: string;
    examinerCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    programLinks: AssessmentTypeProgram[];
}

export const assessmentTypesService = {
    async getAll(): Promise<AssessmentType[]> {
        const response = await api.get('/assessment-types');
        return response.data.assessmentTypes;
    },

    async create(data: {
        name: string;
        code: string;
        examinerCount: number;
        isActive: boolean;
        programIds: number[];
    }): Promise<AssessmentType> {
        const response = await api.post('/assessment-types', data);
        return response.data.assessmentType;
    },

    async update(id: number, data: {
        name?: string;
        code?: string;
        examinerCount?: number;
        isActive?: boolean;
        programIds?: number[];
    }): Promise<AssessmentType> {
        const response = await api.put(`/assessment-types/${id}`, data);
        return response.data.assessmentType;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/assessment-types/${id}`);
    }
};
