import React, { useState, useEffect } from 'react';
import { X, Loader2, Users } from 'lucide-react';
import { AssessmentType, assessmentTypesService } from '../src/services/assessmentTypes.service';
import { programsService } from '../src/services/programs.service';

interface Props {
    editTarget: AssessmentType | null;
    onSave: () => void;
    onClose: () => void;
}

const AssessmentTypeModal: React.FC<Props> = ({ editTarget, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [examinerCount, setExaminerCount] = useState(1);
    const [isActive, setIsActive] = useState(true);
    const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);
    const [programs, setPrograms] = useState<{ id: number; name: string; code: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!editTarget;

    useEffect(() => {
        programsService.getAll().then(p => setPrograms(p));
    }, []);

    // Populate fields when editing
    useEffect(() => {
        if (editTarget) {
            setName(editTarget.name);
            setCode(editTarget.code);
            setExaminerCount(editTarget.examinerCount);
            setIsActive(editTarget.isActive);
            setSelectedProgramIds(editTarget.programLinks.map(l => l.programId));
        } else {
            setName('');
            setCode('');
            setExaminerCount(1);
            setIsActive(true);
            setSelectedProgramIds([]);
        }
    }, [editTarget]);

    // Auto-generate code from name while typing
    const handleNameChange = (val: string) => {
        setName(val);
        if (!isEditing) {
            setCode(val.toUpperCase().trim().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''));
        }
    };

    const toggleProgram = (id: number) => {
        setSelectedProgramIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) {
            setError('Name and code are required.');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            const payload = { name, code, examinerCount, isActive, programIds: selectedProgramIds };
            if (isEditing && editTarget) {
                await assessmentTypesService.update(editTarget.id, payload);
            } else {
                await assessmentTypesService.create(payload);
            }
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save assessment type');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h2 className="text-lg font-bold text-white">
                        {isEditing ? 'Edit Assessment Type' : 'New Assessment Type'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Name & Code */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => handleNameChange(e.target.value)}
                                placeholder="e.g. Practical Exam"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Code (Auto)</label>
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                placeholder="e.g. PRACTICAL"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Examiner Count */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Examiners Required Per Student</span>
                        </label>
                        <div className="flex items-center gap-3">
                            {[1, 2, 3, 4].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setExaminerCount(n)}
                                    className={`w-11 h-11 rounded-lg text-sm font-bold border-2 transition-colors ${examinerCount === n
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <span className="text-sm text-gray-500 ml-1">
                                {examinerCount === 1 ? 'Single examiner' : `${examinerCount} examiners required`}
                            </span>
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
                        </button>
                        <label className="text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => setIsActive(!isActive)}>
                            {isActive ? 'Active — visible to examiners' : 'Inactive — hidden from examiners'}
                        </label>
                    </div>

                    {/* Eligible Programs */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Eligible Programs <span className="text-gray-400 font-normal">(select programs that can write this exam)</span>
                        </label>
                        {programs.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Loading programs...</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {programs.map(prog => (
                                    <label
                                        key={prog.id}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${selectedProgramIds.includes(prog.id)
                                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedProgramIds.includes(prog.id)}
                                            onChange={() => toggleProgram(prog.id)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{prog.name}</span>
                                        <span className="ml-auto text-xs font-mono text-gray-400 shrink-0">{prog.code}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {selectedProgramIds.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1.5">⚠ No programs selected — all programs can access this assessment by default.</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSaving ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssessmentTypeModal;
