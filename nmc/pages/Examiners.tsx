import React, { useState } from 'react';
import { User } from '../types';
import { usersService } from '../src/services/users.service';
import { useToast } from '../src/context/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Trash2,
  UserPlus,
  Search,
  Plus,
  X,
  AlertTriangle,
  Save,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import ConfirmationModal from '../src/components/ConfirmationModal';

const Examiners: React.FC = () => {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'EXAMINER'
  });

  // Queries
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
  });

  // Filter to only show examiners
  const examiners = allUsers.filter(u => u.role === 'EXAMINER' || u.role === 'Examiner');

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      success('Examiner created successfully!');
    },
    onError: (err: any) => {
      error(`Error: ${err.response?.data?.error || 'Failed to create examiner'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<User> }) => usersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      success('Examiner updated successfully!');
    },
    onError: (err: any) => {
      error(`Error: ${err.response?.data?.error || 'Failed to update examiner'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirmation(null);
      success('Examiner deleted successfully!');
    },
    onError: (err: any) => {
      error(`Error: ${err.response?.data?.error || 'Failed to delete examiner'}`);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setModalMode('Add');
    setEditingId(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'EXAMINER' });
    setIsModalOpen(true);
  };

  const openEditModal = (examiner: User) => {
    setModalMode('Edit');
    setEditingId(examiner.id);
    setFormData({ ...examiner, password: '' }); // Don't pre-fill password
    setIsModalOpen(true);
  };

  const handleSaveExaminer = () => {
    if (!formData.name || !formData.username || !formData.email) {
      error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'Add') {
      if (!formData.password) {
        error('Password is required for new examiners');
        return;
      }
      createMutation.mutate({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'EXAMINER'
      });
    } else if (editingId) {
      const updateData: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: 'EXAMINER'
      };
      // Only include password if it was changed
      if (formData.password && formData.password.trim()) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingId, data: updateData });
    }
  };

  const handleDeleteExaminer = () => {
    if (deleteConfirmation) {
      deleteMutation.mutate(deleteConfirmation);
    }
  };

  // Filter Logic
  const filteredExaminers = examiners.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.email && ex.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-gray-700 font-bold flex items-center gap-2 uppercase text-sm">
            <UserPlus className="w-5 h-5 text-gray-500" /> Manage Examiners
          </h2>
          <button
            onClick={openAddModal}
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-colors uppercase"
          >
            <Plus className="w-4 h-4" /> Add Examiner
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex w-full sm:w-auto overflow-x-auto border border-blue-500 rounded shadow-sm">
              <button className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">COPY</button>
              <button className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">EXCEL</button>
              <button className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-r border-blue-200">PDF</button>
              <button className="whitespace-nowrap flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50">PRINT</button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
              <span className="text-gray-600 text-sm font-medium whitespace-nowrap">SEARCH:</span>
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, Username, or Email"
                  className="border border-gray-300 rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">S/N</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">USERNAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CONTACT INFO</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-40">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExaminers.map((examiner, index) => (
                  <tr key={examiner.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 font-medium">{index + 1}</td>
                    <td className="py-4 px-4 text-sm text-gray-800">
                      <div className="font-semibold">{examiner.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">ID: {examiner.id}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 font-mono">{examiner.username}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {examiner.email}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(examiner)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition-colors"
                          title="Edit Examiner"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(examiner.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                          title="Delete Examiner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExaminers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 italic bg-gray-50/30">
                      No examiners found matching "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Delete Examiner"
        message="Are you sure? This action cannot be undone."
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        type="danger"
        onConfirm={handleDeleteExaminer}
        onCancel={() => setDeleteConfirmation(null)}
      />

      {/* Add/Edit Examiner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl relative flex flex-col animate-[fadeIn_0.2s_ease-out]">

            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {modalMode === 'Add' ? <Plus className="w-5 h-5 textblue-600" /> : <Edit className="w-5 h-5 text-blue-600" />}
                {modalMode} Examiner
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Full Name <span className="text-red-600">*</span></label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Username <span className="text-red-600">*</span></label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="e.g. jdoe"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email Address <span className="text-red-600">*</span></label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  type="email"
                  placeholder="e.g. john@example.com"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Password {modalMode === 'Add' && <span className="text-red-600">*</span>}
                  {modalMode === 'Edit' && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}
                </label>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  type="password"
                  placeholder={modalMode === 'Add' ? 'Enter password' : 'Enter new password (optional)'}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExaminer}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Examiner</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examiners;