import api from '../lib/api';
import { Program } from '../../types';

export const programsService = {
    async getAll(): Promise<Program[]> {
        const response = await api.get('/programs');
        if (Array.isArray(response.data)) {
            return response.data;
        }
        return response.data.data || response.data.programs || [];
    },

    async create(program: Partial<Program>): Promise<Program> {
        const response = await api.post('/programs', program);
        return response.data.program;
    },

    async update(id: number | string, program: Partial<Program>): Promise<Program> {
        const response = await api.put(`/programs/${id}`, program);
        return response.data.program;
    },

    async delete(id: number | string): Promise<void> {
        await api.delete(`/programs/${id}`);
    },
};
