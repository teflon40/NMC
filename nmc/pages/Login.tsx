import React, { useState } from 'react';
import { User as UserIcon, Lock, ArrowRight, Activity, RotateCcw, Info } from 'lucide-react';
import { authService } from '../src/services/auth.service';
import { useAuth } from '../src/context/AuthContext';
import ConfirmationModal from '../src/components/ConfirmationModal';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login({ username, password });
      login(response.user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Application',
      message: 'This will clear all local storage and reset the application state. Continue?',
      onConfirm: () => {
        localStorage.clear();
        window.location.reload();
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.5s_ease-out]">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <Activity className="w-full h-full text-white transform scale-150 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold tracking-tight">NMTC Admin Portal</h2>
            <p className="text-blue-100 mt-2 text-sm font-medium">Secure Login Access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-gray-800 font-bold text-lg">Welcome Back!</h3>
            <p className="text-gray-500 text-sm">Please sign in to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center border border-red-100 flex items-center justify-center gap-2 animate-[pulse_0.5s]">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Username</label>
            <div className="relative group">
              <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs"
              title="Reset to default admin credentials"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {/* Demo Credentials Hint */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 space-y-2">
            <div className="flex items-center gap-2 font-bold border-b border-blue-100 pb-1">
              <Info className="w-3 h-3" /> Demo Credentials:
            </div>
            {/* Admin Hint */}
            <div className="grid grid-cols-[65px_1fr] gap-1">
              <span className="text-blue-600 font-bold">Admin:</span>
              <div>
                <span className="font-mono font-bold select-all">nmtc-teshie</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="font-mono font-bold select-all">password</span>
              </div>
            </div>
            {/* Examiner Hint */}
            <div className="grid grid-cols-[65px_1fr] gap-1">
              <span className="text-pink-600 font-bold">Examiner:</span>
              <div>
                <span className="font-mono font-bold select-all">AGYAATENG</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="font-mono font-bold select-all">password</span>
              </div>
            </div>
          </div>
        </form>
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Protected by Admin System v1.0 &copy; 2026
          </p>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Login;