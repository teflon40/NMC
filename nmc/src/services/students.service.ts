import api from '../lib/api';

export interface Student {
    id: number;
    indexNo: string;
    lastname: string;
    othernames: string;
    programId: number;
    program?: {
        id: number;
        name: string;
        shortName: string;
        code: string;
    };
}


export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface StudentsResponse {
    students: Student[];
    pagination: PaginationMeta;
}

export const studentsService = {
    async getAll(params: { page?: number; limit?: number; search?: string; programId?: number } = {}): Promise<StudentsResponse> {
        const { page = 1, limit = 50, search, programId } = params;
        const response = await api.get('/students', { params: { page, limit, search, programId } });
        return response.data;
    },

    async getById(id: number): Promise<Student> {
        const response = await api.get(`/students/${id}`);
        return response.data.student;
    },

    async create(student: Omit<Student, 'id'>): Promise<Student> {
        const response = await api.post('/students', student);
        return response.data.student;
    },

    async update(id: number, student: Partial<Student>): Promise<Student> {
        const response = await api.put(`/students/${id}`, student);
        return response.data.student;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/students/${id}`);
    },

    async bulkCreate(students: Omit<Student, 'id'>[]): Promise<number> {
        const response = await api.post('/students/bulk', { students });
        return response.data.count;
    },

    async bulkDelete(ids: number[]): Promise<number> {
        const response = await api.post('/students/bulk-delete', { ids });
        return response.data.count;
    },

    async promote(studentIds: number[], newLevel: string): Promise<number> {
        const response = await api.post('/students/promote', { studentIds, newLevel });
        return response.data;
    },

    async getTaskCompletion(studentId: number): Promise<{ counts: { practical: number; care_study: number; care_plan: number; obstetrician: number; total: number }; programMaxTasks: number }> {
        const response = await api.get(`/students/${studentId}/task-completion`);
        return response.data;
    },

    async getTaskStatus(studentId: number): Promise<{ taskStatus: any[] }> {
        const response = await api.get(`/results/student/${studentId}/task-status`);
        return response.data;
    }
};
