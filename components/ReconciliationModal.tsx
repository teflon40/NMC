import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Save } from 'lucide-react';

interface ReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessments: any[];
    onSubmitFinal: (selectedProcedures: any, notes: string) => void;
    isSubmitting?: boolean;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
    isOpen,
    onClose,
    assessments,
    onSubmitFinal,
    isSubmitting = false
}) => {
    const [notes, setNotes] = useState('');
    const [selectedProcedures, setSelectedProcedures] = useState<Record<string, { score: number, selectedFrom: number }>>({});

    if (!isOpen || assessments.length !== 2) return null;

    const [assessor1, assessor2] = assessments;
    const task = assessor1.task;
    const student = assessor1.student;
    const procedures = task?.procedures || [];

    const handleSelectScore = (procedureId: number, score: number, assessorNum: number) => {
        setSelectedProcedures(prev => ({
            ...prev,
            [procedureId]: { score, selectedFrom: assessorNum }
        }));
    };

    const isComplete = procedures.length > 0 && procedures.every((p: any) => selectedProcedures[p.id]);

    const handleSubmit = () => {
        if (!isComplete) return;
        onSubmitFinal(selectedProcedures, notes);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h3 className="font-bold text-2xl text-gray-800 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                            Granular Reconciliation
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {task?.title} - {student?.lastname} {student?.othernames} ({student?.indexNo})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Assessor Summary */}
                    <div className="grid grid-cols-2 gap-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">1</div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assessor 1</p>
                                <p className="font-bold text-gray-800">{assessor1.creator?.name || 'Unknown'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-l pl-8">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">2</div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assessor 2</p>
                                <p className="font-bold text-gray-800">{assessor2.creator?.name || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Procedure Granular List */}
                    <div className="space-y-4">
                        {procedures.map((proc: any, idx: number) => {
                            const score1 = assessor1.details?.procedureScores?.[proc.stepNumber] ?? assessor1.details?.[proc.id] ?? 0;
                            const score2 = assessor2.details?.procedureScores?.[proc.stepNumber] ?? assessor2.details?.[proc.id] ?? 0;
                            const selection = selectedProcedures[proc.id];

                            return (
                                <div key={proc.id} className={`p-4 rounded-xl border transition-all ${selection ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-90'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3">
                                            <span className="text-xs font-bold text-gray-400 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                            <h4 className="font-bold text-gray-800 text-sm leading-tight">{proc.description}</h4>
                                        </div>
                                        {selection ? (
                                            <span className="text-[10px] font-black uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">Selected</span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 animate-pulse">Pending</span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleSelectScore(proc.id, score1, 1)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${selection?.selectedFrom === 1
                                                ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 shadow-sm'
                                                : 'border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
                                        >
                                            <span className="text-xs font-bold text-gray-500 uppercase">Assessor 1</span>
                                            <span className="text-xl font-black text-gray-900">{score1}</span>
                                        </button>
                                        <button
                                            onClick={() => handleSelectScore(proc.id, score2, 2)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${selection?.selectedFrom === 2
                                                ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600 shadow-sm'
                                                : 'border-gray-100 bg-white hover:border-purple-300 hover:bg-purple-50/50'}`}
                                        >
                                            <span className="text-xs font-bold text-gray-500 uppercase">Assessor 2</span>
                                            <span className="text-xl font-black text-gray-900">{score2}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Notes */}
                    <div className="pt-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                            Reconciliation Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any clarification for the final result..."
                            className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="text-sm font-bold text-gray-500">
                        {Object.keys(selectedProcedures).length} / {procedures.length} Reconciled
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isComplete || isSubmitting}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-black text-white shadow-lg transition-all transform active:scale-95 ${isComplete
                                ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-200'
                                : 'bg-gray-300 cursor-not-allowed opacity-70'}`}
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">Submitting...</span>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Finalize Result
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReconciliationModal;
