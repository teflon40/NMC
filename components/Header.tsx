import React, { useState, useEffect } from 'react';
import { Menu, User, LogOut, UserCog, X, Save, Mail, Lock, Key } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout: () => void;
  user: any;
  onUpdateProfile: (data: any) => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout, user, onUpdateProfile, isSidebarOpen }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Reset form data when modal opens or user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user, isEditModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Password Validation
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        alert("New passwords do not match!");
        return;
      }
      // Optional: Check current password if we had real auth
    }

    // Prepare update object
    const updates: any = {
      name: formData.name,
      username: formData.username,
      email: formData.email,
    };

    // Only update password if provided
    if (formData.newPassword) {
      updates.password = formData.newPassword;
    }

    onUpdateProfile(updates);

    alert(`Profile updated successfully!`);
    setIsEditModalOpen(false);
  };

  const openEditProfile = () => {
    setIsProfileOpen(false);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <header className={`bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 fixed top-0 right-0 z-30 transition-all duration-300 ${isSidebarOpen ? 'left-0 md:left-64' : 'left-0'}`}>
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded-md shrink-0 transition-colors">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-sm md:text-lg lg:text-xl font-bold text-slate-800 truncate">
            Nursing And Midwifery Training School, Teshie (307246)
          </h1>
        </div>

        <div className="flex items-center relative">
          <div className="flex flex-col items-end mr-3 hidden sm:block">
            {/* Placeholder for user info if needed */}
          </div>

          {/* Profile Dropdown Trigger */}
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 cursor-pointer relative hover:bg-gray-200 transition-colors"
          >
            <User className="w-6 h-6 text-gray-600" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <>
              {/* Backdrop to close when clicking outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProfileOpen(false)}
              ></div>

              <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 animate-[fadeIn_0.2s_ease-out]">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={openEditProfile}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <UserCog className="w-4 h-4" /> Edit Profile
                </button>
                <button
                  onClick={() => { setIsProfileOpen(false); onLogout(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl relative flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <UserCog className="w-6 h-6 text-blue-600" />
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* User Info Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">Personal Information</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      type="text"
                      className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Username</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="e.g. admin"
                      className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      type="email"
                      className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-2">Change Password</h4>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Current Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      type="password"
                      placeholder="••••••••"
                      className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">New Password</label>
                    <input
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      type="password"
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Confirm New</label>
                    <input
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      type="password"
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;