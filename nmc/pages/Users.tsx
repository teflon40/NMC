import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { usersService } from '../src/services/users.service';
import { Plus, X, Trash2, UserCog, ShieldAlert, AlertTriangle, Edit } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';
import ConfirmationModal from '../src/components/ConfirmationModal';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'Add' | 'Edit'>('Add');
  const [editingId, setEditingId] = useState<number | null>(null);

  const { success, error: toastError } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<(number | string)[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toastError('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Examiner' as 'Administrator' | 'Examiner'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setModalMode('Add');
    setFormData({ name: '', username: '', email: '', password: '', confirmPassword: '', role: 'Administrator' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('Edit');
    setEditingId(user.id || null);
    // Don't fill password fields for edit
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (modalMode === 'Add') {
        // Validation for Add
        if (!formData.name || !formData.username || !formData.email || !formData.password) {
          toastError('All fields are required.');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toastError('Passwords do not match.');
          return;
        }

        await usersService.create({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          role: formData.role,
          password: formData.password
        });
      } else {
        // Validation for Edit
        if (!formData.name || !formData.username || !formData.email) {
          toastError('Name, Username and Email are required.');
          return;
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
          toastError('Passwords do not match.');
          return;
        }

        if (editingId) {
          await usersService.update(editingId, {
            name: formData.name,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {})
          });
        }
      }

      setIsModalOpen(false);
      success(modalMode === 'Add' ? 'User created successfully' : 'User updated successfully');
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation) {
      try {
        await usersService.delete(deleteConfirmation);
        setUsers(users.filter(u => u.id !== deleteConfirmation && u.username !== deleteConfirmation));
        setDeleteConfirmation(null);
        success('User deleted successfully');
      } catch (err) {
        console.error(err);
        toastError('Failed to delete user');
      }
    }
  };

  const handleToggleRole = async (user: User) => {
    if (!user.id) return;
    try {
      const newRole = user.role === 'Administrator' ? 'Examiner' : 'Administrator';
      await usersService.update(user.id, { role: newRole });
      success('User role updated successfully');
      fetchUsers(); // Refresh to ensure sync
    } catch (err) {
      console.error(err);
      toastError('Failed to update role');
    }
  };

  const toggleUserSelection = (id: number | string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredUsers = () => {
    const validFilteredUserIds = filteredUsers.map(u => u.id).filter(id => id !== undefined);

    if (selectedUserIds.length === validFilteredUserIds.length && validFilteredUserIds.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(validFilteredUserIds as (number | string)[]);
    }
  };

  const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);

  const handleBulkDelete = async () => {
    try {
      await usersService.bulkDelete(selectedUserIds);
      success(`Successfully deleted ${selectedUserIds.length} users`);
      setSelectedUserIds([]);
      setBulkConfirmModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.error || 'Failed to bulk delete users');
      setBulkConfirmModalOpen(false);
    }
  };

  // Filter logic - Only show Administrators (case-insensitive)
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const isAdmin = user.role?.toUpperCase() === 'ADMINISTRATOR';
    return matchesSearch && isAdmin;
  });

  return (
    <div className="space-y-6 relative">
      {/* List of Admins Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
            List of Admins
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              SHOW
              <select className="border border-gray-300 rounded px-2 py-1 mx-2 focus:outline-none">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              ENTRIES
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
              {selectedUserIds.length > 0 && (
                <button
                  onClick={() => setBulkConfirmModalOpen(true)}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap border border-red-200"
                >
                  <Trash2 className="w-4 h-4" /> Delete ({selectedUserIds.length})
                </button>
              )}
              <span className="text-gray-600 text-sm font-medium whitespace-nowrap">SEARCH:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Username, or Email"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAllFilteredUsers}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">USERNAME</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">EMAIL</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">ROLE</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.username} className={`hover:bg-gray-50 group transition-colors ${user.id && selectedUserIds.includes(user.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={user.id ? selectedUserIds.includes(user.id) : false}
                        onChange={() => user.id && toggleUserSelection(user.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{user.name}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{user.username}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        onClick={() => handleToggleRole(user)}
                        className={`px-3 py-1 rounded-full text-xs font-bold text-white cursor-pointer select-none transition-transform active:scale-95 inline-block
                            ${user.role === 'Administrator' ? 'bg-[#00C853] hover:bg-green-600' : 'bg-[#E91E63] hover:bg-pink-600'}`}
                        title="Click to toggle role"
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleRole(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Change Role"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(user.id || null)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 italic">No admins found matching "{searchQuery}".</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Admin Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
            Add Admin
          </h2>
        </div>
        <div className="p-6 flex justify-end">
          <button
            onClick={openAddModal}
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2 shadow-sm transition-colors uppercase"
          >
            <Plus className="w-4 h-4" /> ADD ADMIN
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirmation(null)}
      />

      <ConfirmationModal
        isOpen={bulkConfirmModalOpen}
        title={`Delete ${selectedUserIds.length} Users`}
        message={`Are you sure you want to permanently delete these ${selectedUserIds.length} selected users?`}
        confirmText="Delete Users"
        type="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmModalOpen(false)}
      />

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded shadow-lg relative flex flex-col max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
              <h3 className="font-bold text-gray-700">{modalMode === 'Add' ? 'Add Admin' : 'Edit User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Error handled by toast now */}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">FULLNAME</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Enter full name"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">USERNAME</label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  type="text"
                  className="w-full border border-gray-300 rounded p-2 text-sm bg-[#FFFDE7] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">E-MAIL ADDRESS</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  type="email"
                  placeholder="Enter Email"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ROLE</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Examiner">Examiner</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">PASSWORD</label>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  type="password"
                  className="w-full border border-gray-300 rounded p-2 text-sm bg-[#FFFDE7] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">CONFIRM PASSWORD</label>
                <input
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  type="password"
                  placeholder="Confirmation"
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-blue-900 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-[#536DFE] text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-blue-600 transition-colors"
              >
                {modalMode === 'Add' ? 'Register' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;