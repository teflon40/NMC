import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { resultsService, ExamResult } from '../src/services/results.service';
import { ChevronLeft, Save, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';

const PracticalReconciliation: React.FC = () => {
    const { success, error: toastError } = useToast();
    const { reconciliationId } = useParams<{ reconciliationId: string }>();
    const navigate = useNavigate();
    const [reconciliationNotes, setReconciliationNotes] = useState('');

    // State to track selected scores for EACH procedure
    // Map of procedureId -> { score, selectedFrom: 1 | 2 }
    const [selectedProcedures, setSelectedProcedures] = useState<Record<string, { score: number, selectedFrom: number }>>({});

    // Fetch both assessments
    const { data: assessments, isLoading, error } = useQuery({
        queryKey: ['reconciliation', reconciliationId],
        queryFn: () => resultsService.getReconciliation(reconciliationId!),
        enabled: !!reconciliationId
    });

    const submitMutation = useMutation({
        mutationFn: (data: any) => resultsService.submitPracticalFinalResult(reconciliationId!, data.selectedProcedures, data.reconciliationNotes),
        onSuccess: () => {
            success('Reconciled practical result submitted successfully!');
            navigate('/reconciliation-list');
        },
        onError: (err: any) => {
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to submit reconciliation';
            if (errorMessage.includes('already been reconciled')) {
                toastError('This assessment has already been reconciled by another examiner.');
                navigate('/reconciliation-list');
            } else {
                toastError(`Failed to submit: ${errorMessage}`);
            }
        }
    });

    if (isLoading) return <div className="p-8">Loading reconciliation data...</div>;
    if (error || !assessments || assessments.length < 2) return <div className="p-8 text-red-600">Error loading data. Need 2 assessments to reconcile.</div>;

    const assessor1 = assessments.find(a => a.assessorNumber === 1);
    const assessor2 = assessments.find(a => a.assessorNumber === 2);

    if (!assessor1 || !assessor2) return <div className="p-8">Missing one or both assessments.</div>;

    // Extract procedures from the task definition
    // Assuming both assessments form the same task, so procedures are identical
    const procedures = assessor1.task?.procedures || [];

    const handleSelectScore = (procedureId: number, score: number, assessorNum: number) => {
        setSelectedProcedures(prev => ({
            ...prev,
            [procedureId]: { score, selectedFrom: assessorNum }
        }));
    };

    const isComplete = procedures.length > 0 && procedures.every((p) => selectedProcedures[p.id]);

    const handleSubmit = () => {
        if (!isComplete) {
            toastError('Please select a score for every procedure.');
            return;
        }
        submitMutation.mutate({ selectedProcedures, reconciliationNotes });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            <button onClick={() => navigate('/practical-exams')} className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Exams
            </button>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Practical Exam Reconciliation</h1>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                        <p className="text-yellow-800 font-medium">Reconciliation Required</p>
                        <p className="text-yellow-700 text-sm">Two examiners have assessed this student. Please select the final score for <strong>each procedure</strong> below.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Student</h3>
                        <p className="text-lg font-semibold">{assessor1.student?.lastname} {assessor1.student?.othernames}</p>
                        <p className="text-gray-600">{assessor1.student?.indexNo}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Task</h3>
                        <p className="text-lg font-semibold">{assessor1.task?.title}</p>
                        <p className="text-gray-600">{assessor1.task?.category}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t pt-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">1</div>
                            <div>
                                <p className="font-bold text-lg text-gray-800">{assessor1.creator?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Assessor 1</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">2</div>
                            <div>
                                <p className="font-bold text-lg text-gray-800">{assessor2.creator?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Assessor 2</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {procedures.map((proc: any) => {
                    // Extract scores from details
                    // Assuming structure details.procedures[proc.id].score is reliable if we used similar storage
                    // OR if details is just { [procId]: score }
                    // Let's verify how practical results are stored.
                    // In results.controller.ts for submitPractical logic, details is passed from frontend.
                    // In frontend, scores is { [procId]: number }.
                    // So details likely is { [procId]: number } OR { procedures: { [procId]: { score: ... } } }
                    // checking submitPracticalResult in controller -> `details: details || {}`
                    // In frontend -> mutation passes `scores`. But `scores` isn't passed as details. 
                    // Wait, let's check `resultsService.submitPractical`:
                    /*
                        export interface SubmitPracticalResult {
                            ...
                            details?: any;
                        }
                    */
                    // In UI, `scores` is state. `submitMutation` calls `resultsService.submitPractical`.
                    // But `resultsService` expects `data` object.
                    // I need to correct PracticalExams.tsx to pass `details: { procedures: scores }` or similar.

                    // In PracticalExams.tsx, scores are uploaded inside details.rawScores
                    const score1 = assessor1.details?.rawScores?.[proc.id] ?? 0;
                    const score2 = assessor2.details?.rawScores?.[proc.id] ?? 0;

                    const selected = selectedProcedures[proc.id];

                    return (
                        <div key={proc.id} className={`border rounded-xl p-4 transition-all ${selected ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-medium text-gray-900">{proc.description}</h4>
                                    <span className="text-xs text-gray-500">Max Marks: {proc.maxMarks}</span>
                                </div>
                                {selected ? (
                                    <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm font-medium">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Selected: {selected.score}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">Pending Selection</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Assessor 1 Option */}
                                <button
                                    onClick={() => handleSelectScore(proc.id, score1, 1)}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selected?.selectedFrom === 1
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                        }`}
                                >
                                    <span className="text-sm text-gray-600">Assessor 1</span>
                                    <span className="text-lg font-bold text-gray-900">{score1}</span>
                                </button>

                                {/* Assessor 2 Option */}
                                <button
                                    onClick={() => handleSelectScore(proc.id, score2, 2)}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selected?.selectedFrom === 2
                                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                                        }`}
                                >
                                    <span className="text-sm text-gray-600">Assessor 2</span>
                                    <span className="text-lg font-bold text-gray-900">{score2}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {Object.keys(selectedProcedures).length} of {procedures.length} procedures reconciled
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/practical-exams')}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isComplete || submitMutation.isPending}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-colors ${isComplete
                                ? 'bg-green-600 hover:bg-green-700 shadow-sm'
                                : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <Save className="w-4 h-4" />
                            {submitMutation.isPending ? 'Submitting...' : 'Submit Final Result'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticalReconciliation;
