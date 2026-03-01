import React, { useState } from 'react';
import { Lock, ArrowRight, Activity, ShieldAlert } from 'lucide-react';
import { authService } from '../src/services/auth.service';
import api from '../src/lib/api';

const ForcePasswordChange: React.FC = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isLengthValid = newPassword.length >= 8 && newPassword.length <= 15;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    const isPasswordValid = isLengthValid && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!oldPassword || !newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (!isPasswordValid) {
            setError('New password does not meet all complexity requirements.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/settings/password', { oldPassword, newPassword });

            // On success, update the context/local storage user and reload
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                currentUser.forcePasswordChange = false;
                sessionStorage.setItem('user', JSON.stringify(currentUser));
                window.location.reload();
            }
        } catch (err: any) {
            console.error('Password change error:', err);
            setError(err.response?.data?.error || 'Failed to change password. Please check your current password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-gradient-to-r from-red-600 to-red-800 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <Activity className="w-full h-full text-white transform scale-150 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                            <ShieldAlert className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-white text-xl font-bold tracking-tight">Security Action Required</h2>
                        <p className="text-red-100 mt-2 text-sm font-medium">Please change your default password to continue.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center border border-red-100">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Current Password</label>
                        <div className="relative group">
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-600 transition-colors" />
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                                placeholder="Enter current password"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">New Password</label>
                        <div className="relative group">
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-600 transition-colors" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                                placeholder="Enter new password"
                            />
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 space-y-1 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <p className={`flex items-center gap-1 transition-colors ${isLengthValid ? 'text-green-600' : ''}`}>
                                <span className="w-3 text-center">{isLengthValid ? '✓' : '○'}</span> 8-15 characters
                            </p>
                            <p className={`flex items-center gap-1 transition-colors ${hasUpperCase ? 'text-green-600' : ''}`}>
                                <span className="w-3 text-center">{hasUpperCase ? '✓' : '○'}</span> One uppercase letter
                            </p>
                            <p className={`flex items-center gap-1 transition-colors ${hasLowerCase ? 'text-green-600' : ''}`}>
                                <span className="w-3 text-center">{hasLowerCase ? '✓' : '○'}</span> One lowercase letter
                            </p>
                            <p className={`flex items-center gap-1 transition-colors ${hasNumber ? 'text-green-600' : ''}`}>
                                <span className="w-3 text-center">{hasNumber ? '✓' : '○'}</span> One number
                            </p>
                            <p className={`flex items-center gap-1 transition-colors ${hasSpecial ? 'text-green-600' : ''}`}>
                                <span className="w-3 text-center">{hasSpecial ? '✓' : '○'}</span> One special character
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Confirm New Password</label>
                        <div className="relative group">
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-600 transition-colors" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                                placeholder="Re-enter new password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span>Updating Password...</span>
                        ) : (
                            <>Update Password <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
