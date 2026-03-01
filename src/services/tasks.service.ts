import api from '../lib/api';
import { TaskDefinition } from '../../types';

export interface BulkTaskImport {
    programCode: string;
    category: string;
    title: string;
    taskCode?: string;
    procedures: {
        step: number;
        description: string;
        maxMarks: number;
    }[];
}

export const tasksService = {
    async getAll(): Promise<TaskDefinition[]> {
        const response = await api.get('/tasks');
        return response.data.tasks;
    },

    async getById(id: string): Promise<TaskDefinition> {
        const response = await api.get(`/tasks/${id}`);
        return response.data.task;
    },

    async create(task: Partial<TaskDefinition>): Promise<TaskDefinition> {
        const response = await api.post('/tasks', task);
        return response.data.task;
    },

    async update(id: string, task: Partial<TaskDefinition>): Promise<TaskDefinition> {
        const response = await api.put(`/tasks/${id}`, task);
        return response.data.task;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/tasks/${id}`);
    },

    async bulkImport(tasks: BulkTaskImport[], appendMode: boolean = false): Promise<{ results: any }> {
        const response = await api.post('/tasks/bulk-import', { tasks, appendMode });
        return response.data;
    },

    async bulkDelete(ids: string[]): Promise<{ message: string, count: number }> {
        const response = await api.post('/tasks/bulk-delete', { ids });
        return response.data;
    }
};
