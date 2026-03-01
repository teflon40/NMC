import React, { useState, useEffect } from 'react';
import { Settings, X, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentTypesService, AssessmentType } from '../src/services/assessmentTypes.service';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';

interface Props {
    /** The assessment type code, e.g. "PRACTICAL", "CARE_STUDY", "CARE_PLAN", "OBSTETRICIAN" */
    assessmentCode: string;
    /** Display name shown in the panel header */
    assessmentName: string;
    /** Accent color for the gear icon */
    accentColor?: string;
}

const AssessmentSettingsPanel: React.FC<Props> = ({
    assessmentCode,
    assessmentName,
    accentColor = 'text-gray-500',
}) => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Only admins see the gear
    if (user?.role !== 'ADMINISTRATOR') return null;

    // Fetch all assessment types and find ours
    const { data: allTypes = [], isLoading } = useQuery({
        queryKey: ['assessment-types'],
        queryFn: assessmentTypesService.getAll,
        enabled: isOpen,
    });

    const currentType = allTypes.find(
        (t) => t.code.toUpperCase() === assessmentCode.toUpperCase()
    );

    // Local form state
    const [examinerCount, setExaminerCount] = useState(1);
    const [isActive, setIsActive] = useState(true);
    const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);

    // Fetch programs for the checkbox list
    const { data: programs = [] } = useQuery({
        queryKey: ['programs-list'],
        queryFn: async () => {
            const { programsService } = await import('../src/services/programs.service');
            return programsService.getAll();
        },
        enabled: isOpen,
    });

    // Sync local state when data loads
    useEffect(() => {
        if (currentType) {
            setExaminerCount(currentType.examinerCount);
            setIsActive(currentType.isActive);
            setSelectedProgramIds(
                currentType.programLinks?.map((l: any) => l.program?.id || l.programId) || []
            );
        }
    }, [currentType]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name: assessmentName,
                code: assessmentCode,
                examinerCount,
                isActive,
                programIds: selectedProgramIds,
            };
            if (currentType) {
                return assessmentTypesService.update(currentType.id, payload);
            } else {
                return assessmentTypesService.create(payload);
            }
        },
        onSuccess: () => {
            success('Assessment settings saved!');
            queryClient.invalidateQueries({ queryKey: ['assessment-types'] });
        },
        onError: (err: any) => {
            toastError(err.response?.data?.error || 'Failed to save settings');
        },
    });

    const toggleProgram = (id: number) => {
        setSelectedProgramIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    return (
        <>
            {/* Gear Icon */}
            <button
                onClick={() => setIsOpen(true)}
                className={`p-1.5 rounded-full hover:bg-white/50 transition-colors ${accentColor}`}
                title="Assessment Settings"
            >
                <Settings className="w-5 h-5" />
            </button>

            {/* Slide-out Panel */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-gray-600" />
                                <h2 className="font-bold text-gray-800">{assessmentName} Settings</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoading ? (
                                <div className="text-center text-gray-400 py-12">Loading settings...</div>
                            ) : (
                                <>
                                    {/* Examiners Required */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                                            <Users className="w-4 h-4" />
                                            Examiners Required Per Student
                                        </label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4].map((n) => (
                                                <button
                                                    key={n}
                                                    onClick={() => setExaminerCount(n)}
                                                    className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${examinerCount === n
                                                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                                                        }`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {examinerCount === 1 ? 'Single examiner' : `${examinerCount} examiners must assess each student`}
                                        </p>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="text-sm font-bold text-gray-700">Active</p>
                                            <p className="text-xs text-gray-400">Visible to examiners</p>
                                        </div>
                                        <button
                                            onClick={() => setIsActive(!isActive)}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Eligible Programs */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-3 block">
                                            Eligible Programs
                                        </label>
                                        <p className="text-xs text-gray-400 mb-3">
                                            Select programs that can write this exam
                                        </p>
                                        <div className="space-y-2">
                                            {programs.map((prog: any) => (
                                                <label
                                                    key={prog.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedProgramIds.includes(prog.id)
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProgramIds.includes(prog.id)}
                                                        onChange={() => toggleProgram(prog.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium text-gray-700">{prog.name}</span>
                                                        <span className="ml-2 text-xs text-gray-400 font-mono">{prog.code}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        {selectedProgramIds.length === 0 && (
                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                                                <span>⚠</span>
                                                No programs selected — all programs can access this assessment by default.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 p-4 flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
        </>
    );
};

export default AssessmentSettingsPanel;
