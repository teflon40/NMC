import api from '../lib/api';
import { User } from '../../types';

export const usersService = {
    async getAll(): Promise<User[]> {
        const response = await api.get('/users');
        return response.data.users;
    },

    async create(user: Partial<User>): Promise<User> {
        const response = await api.post('/users', user);
        return response.data.user;
    },

    async update(id: number | string, user: Partial<User>): Promise<User> {
        const response = await api.put(`/users/${id}`, user);
        return response.data.user;
    },

    async delete(id: number | string): Promise<void> {
        await api.delete(`/users/${id}`);
    },

    async bulkDelete(ids: (number | string)[]): Promise<{ message: string, count: number }> {
        const response = await api.post('/users/bulk-delete', { ids });
        return response.data;
    }
};
