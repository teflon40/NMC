import React, { useState, useEffect } from 'react';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';

const Settings: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // System Settings State
    const [systemSettings, setSystemSettings] = useState({
        SCHOOL_NAME: '',
        SCHOOL_CODE: '',
        CURRENT_YEAR: new Date().getFullYear().toString()
    });

    const { success, error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [wipeOptions, setWipeOptions] = useState({
        results: true,
        tasks: false,
        candidates: false,
        examiners: false,
        programs: false,
        users: false
    });


    useEffect(() => {
        fetchProfile();
        fetchSystemSettings();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/settings/profile');
            setUser(response.data.user);
            setName(response.data.user.name);
            setEmail(response.data.user.email);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const response = await api.get('/settings/system');
            if (Object.keys(response.data).length > 0) {
                setSystemSettings(prev => ({ ...prev, ...response.data }));
            } else {
                // If no settings yet, keep defaults but maybe fetch hardcoded if desired
                // For now, we rely on what's in DB or empty
            }
        } catch (error) {
            console.error('Failed to fetch system settings:', error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.put('/settings/profile', { name, email });
            success('Profile updated successfully');
            fetchProfile(); // Refresh data
        } catch (error: any) {
            toastError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const isLengthValid = passwordData.newPassword.length >= 8 && passwordData.newPassword.length <= 15;
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwordData.newPassword);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toastError('New passwords do not match');
            return;
        }

        if (!isLengthValid || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
            toastError('New password does not meet all complexity requirements');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/settings/password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            success('Password changed successfully');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toastError(error.response?.data?.error || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSystemSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.put('/settings/system', systemSettings);
            success('System settings updated successfully');
            // Optionally force a page reload to reflect changes in Header/Sidebar if they use these settings
            // window.location.reload(); 
        } catch (error: any) {
            toastError(error.response?.data?.error || 'Failed to update system settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFactoryReset = async () => {
        if (resetConfirmation !== 'RESET') {
            toastError('You must type EXACTLY "RESET" to confirm.');
            return;
        }

        // Check if anything is selected
        if (!Object.values(wipeOptions).some(v => v)) {
            toastError('You must select at least one data type to obliterate.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/settings/factory-reset',
                { confirmationText: resetConfirmation, wipeOptions }
            );
            success(response.data.message || 'Selective wipe executed successfully.');
            setIsResetModalOpen(false);
            setResetConfirmation('');

            // Reload page to clear out any stale frontend state
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            toastError(error.response?.data?.error || 'Failed to execute selective wipe');
        } finally {
            setIsLoading(false);
        }
    };

    const isAdmin = currentUser?.role === 'ADMINISTRATOR' || currentUser?.role === 'Administrator';

    // ── Tab config ────────────────────────────────────────────────────
    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'system', label: 'System Configuration', adminOnly: true },
    ] as const;

    // Helper for wipe option toggles
    const handleWipeOptionToggle = (key: keyof typeof wipeOptions) => {
        setWipeOptions(prev => {
            const next = { ...prev, [key]: !prev[key] };

            // Automatic cascading safety toggle logic
            if (key === 'programs' && next.programs) {
                // If checking programs, auto-check everything below it
                next.examiners = true;
                next.candidates = true;
                next.tasks = true;
                next.results = true;
            } else if (key === 'candidates' && next.candidates) {
                // Candidates cascades to results
                next.results = true;
            } else if (!next[key]) {
                // If unchecking something, we must uncheck its parents
                if (key === 'results') next.candidates = false;
                if (['results', 'tasks', 'candidates', 'examiners'].includes(key as string)) {
                    next.programs = false;
                }
            }

            return next;
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-gray-200 gap-1">
                {tabs.filter(t => !('adminOnly' in t) || !t.adminOnly || isAdmin).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {activeTab === 'profile' ? (
                    <div className="space-y-6">
                        {/* Profile Settings */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile Information</h2>
                            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <input
                                        type="text"
                                        value={user?.role || ''}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : 'Update Profile'}
                                </button>
                            </form>
                        </div>

                        {/* Password Settings */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
                            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.oldPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Processing...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* System Configuration */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">General Configuration</h2>
                            <form onSubmit={handleUpdateSystemSettings} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">School / Institution Name</label>
                                    <input
                                        type="text"
                                        value={systemSettings.SCHOOL_NAME}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, SCHOOL_NAME: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Nursing And Midwifery Training School"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Displayed in the header and export documents.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution Code</label>
                                    <input
                                        type="text"
                                        value={systemSettings.SCHOOL_CODE}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, SCHOOL_CODE: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. 307246"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                    <input
                                        type="text"
                                        value={systemSettings.CURRENT_YEAR}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, CURRENT_YEAR: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. 2026"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white rounded-xl shadow-sm border border-red-200 mt-6 overflow-hidden">
                            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-red-800">Danger Zone</h2>
                                    <p className="text-sm text-red-600 mt-1">Irreversible, destructive system operations.</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-gray-800">Selective Data Wipe</h3>
                                        <p className="text-sm text-gray-500 mt-1 max-w-xl">
                                            Choose exactly which parts of the database you want to permanently clear out.
                                            Perfect for wiping exam results before a new semester without recreating your Programs or Tasks.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsResetModalOpen(true)}
                                        className="shrink-0 px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        Initiate Data Wipe
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Factory Reset Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg">Selective Data Wipe</h3>
                            <button onClick={() => setIsResetModalOpen(false)} className="text-white/80 hover:text-white">
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4 font-medium text-sm">
                                Select the components you wish to permanently obliterate from the system.
                            </p>

                            <div className="space-y-2 mb-6 bg-red-50/50 p-4 rounded-lg border border-red-100">
                                {[
                                    { key: 'results', label: 'Exam Results, Scores & Audits', desc: 'Safest wipe. Only clears past examination data.' },
                                    { key: 'tasks', label: 'Tasks & Procedures', desc: 'Wipes all configured Practical and Care topics.' },
                                    { key: 'candidates', label: 'Candidates (Students)', desc: 'Also automatically wipes all their Results.' },
                                    { key: 'examiners', label: 'External Examiners', desc: 'Clears all assessor accounts.' },
                                    { key: 'programs', label: 'Programs', desc: 'CAUTION: Automatically wipes everything bound to them (Candidates, Tasks, Examiners, Results).' },
                                    { key: 'users', label: 'System Users', desc: 'Wipes all other Admins/Sub-admins (except you).' }
                                ].map(({ key, label, desc }) => (
                                    <label key={key} className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${wipeOptions[key as keyof typeof wipeOptions] ? 'bg-red-100' : 'hover:bg-red-50/80'}`}>
                                        <input
                                            type="checkbox"
                                            checked={wipeOptions[key as keyof typeof wipeOptions]}
                                            onChange={() => handleWipeOptionToggle(key as keyof typeof wipeOptions)}
                                            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{label}</div>
                                            <div className="text-xs text-gray-500">{desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <p className="text-sm text-gray-600 mb-3 text-center">
                                Type <strong className="font-mono text-red-700 text-base tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-200">RESET</strong> below to confirm.
                            </p>

                            <input
                                type="text"
                                value={resetConfirmation}
                                onChange={(e) => setResetConfirmation(e.target.value)}
                                placeholder="Type RESET here..."
                                autoComplete="off"
                                className="w-full border-2 border-red-200 rounded-lg p-3 text-center text-lg font-bold tracking-widest focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-6"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsResetModalOpen(false); setResetConfirmation(''); }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleFactoryReset}
                                    disabled={resetConfirmation !== 'RESET' || isLoading}
                                    className={`flex-1 px-4 py-2.5 font-bold rounded-lg transition-colors ${resetConfirmation === 'RESET' && !isLoading
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20'
                                        : 'bg-red-100 text-red-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isLoading ? 'WIPING...' : 'Obliterate Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Settings;
