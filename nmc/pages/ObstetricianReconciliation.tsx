import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { resultsService, ExamResult } from '../src/services/results.service';
import { Save, CheckCircle, User } from 'lucide-react';
import { useToast } from '../src/context/ToastContext';

const ObstetricianReconciliation: React.FC = () => {
    const { success, error: toastError } = useToast();
    const { reconciliationId } = useParams<{ reconciliationId: string }>();
    const navigate = useNavigate();

    // State for selected procedures
    const [selectedProcedures, setSelectedProcedures] = useState<Array<{
        name: string;
        score: number;
        selectedFrom: number; // 1 or 2
    }>>([]);

    const [notes, setNotes] = useState('');

    // Fetch both assessments
    const { data: assessments = [], isLoading } = useQuery({
        queryKey: ['obstetrician-reconciliation', reconciliationId],
        queryFn: () => resultsService.getObstetricianReconciliation(reconciliationId!),
        enabled: !!reconciliationId
    });

    const submitMutation = useMutation({
        mutationFn: () => resultsService.submitObstetricianFinalResult(reconciliationId!, selectedProcedures, notes),
        onSuccess: () => {
            success('Final reconciled result submitted successfully!');
            navigate('/obstetrician-assessment');
        },
        onError: (err: any) => {
            toastError(`Error submitting final result: ${err.message}`);
        }
    });

    // Initialize selected procedures when assessments load
    React.useEffect(() => {
        if (assessments.length === 2 && selectedProcedures.length === 0) {
            const assessment1 = assessments[0];
            const assessment2 = assessments[1];

            const procedures1 = assessment1.details?.procedures || [];
            const procedures2 = assessment2.details?.procedures || [];

            // Match procedures by name
            const procedureMap = new Map<string, any>();

            procedures1.forEach((p: any) => {
                procedureMap.set(p.name, { ...p, assessor: 1 });
            });

            procedures2.forEach((p: any) => {
                if (procedureMap.has(p.name)) {
                    procedureMap.get(p.name)!.score2 = p.score;
                } else {
                    procedureMap.set(p.name, { ...p, assessor: 2 });
                }
            });

            // Initialize with NO selection to force user interaction
            const initialEmpty = Array.from(procedureMap.entries()).map(([name, data]) => ({
                name,
                score: 0,
                selectedFrom: 0
            }));

            setSelectedProcedures(initialEmpty);
        }
    }, [assessments]);

    const selectScore = (procedureName: string, assessorNumber: number, score: number) => {
        setSelectedProcedures(prev =>
            prev.map(p => p.name === procedureName ? { ...p, score, selectedFrom: assessorNumber } : p)
        );
    };

    const calculateTotal = () => {
        return selectedProcedures.reduce((sum, p) => sum + p.score, 0);
    };

    const isComplete = selectedProcedures.length > 0 && selectedProcedures.every(p => p.selectedFrom !== 0);

    if (isLoading) {
        return <div className="p-8 text-center">Loading reconciliation data...</div>;
    }

    if (assessments.length !== 2) {
        return <div className="p-8 text-center text-red-600">Invalid reconciliation. Need exactly 2 assessments.</div>;
    }

    const assessment1 = assessments[0];
    const assessment2 = assessments[1];
    const procedures1 = assessment1.details?.procedures || [];
    const procedures2 = assessment2.details?.procedures || [];

    // Create a combined list of all unique procedures
    const allProcedureNames = Array.from(new Set([
        ...procedures1.map((p: any) => p.name),
        ...procedures2.map((p: any) => p.name)
    ]));

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-8 py-5 border-b border-gray-200 bg-pink-50">
                <h2 className="text-sm font-bold text-pink-800 uppercase tracking-wide">Obstetrician Assessment Reconciliation</h2>
                <p className="text-xs text-pink-600 mt-1">
                    {assessment1.student?.lastname} {assessment1.student?.othernames} • {assessment1.student?.indexNo}
                </p>
            </div>

            <div className="p-8 max-w-5xl mx-auto space-y-6">
                {/* Examiner Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-sm text-blue-800">Examiner 1</span>
                        </div>
                        <p className="text-xs text-blue-700">{assessment1.creator?.name || 'Unknown'}</p>
                        <p className="text-lg font-bold text-blue-900 mt-2">{assessment1.score}%</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-sm text-green-800">Examiner 2</span>
                        </div>
                        <p className="text-xs text-green-700">{assessment2.creator?.name || 'Unknown'}</p>
                        <p className="text-lg font-bold text-green-900 mt-2">{assessment2.score}%</p>
                    </div>
                </div>

                {/* Procedure Comparison Table */}
                {/* Procedure Selection Cards */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Reconcile Procedures</h3>
                        <span className="text-xs text-gray-500">Select the best score for each procedure.</span>
                    </div>

                    {allProcedureNames.map((procName, index) => {
                        const proc1 = procedures1.find((p: any) => p.name === procName);
                        const proc2 = procedures2.find((p: any) => p.name === procName);
                        const selected = selectedProcedures.find(p => p.name === procName);

                        return (
                            <div key={procName} className={`p-5 rounded border-2 transition-all ${selected?.selectedFrom !== 0 ? 'border-pink-200 bg-pink-50' : 'border-gray-200 bg-white'
                                }`}>
                                <h4 className="font-bold text-gray-800 mb-4 text-lg">{procName}</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Assessor 1 Option */}
                                    <button
                                        onClick={() => proc1 && selectScore(procName, 1, proc1.score)}
                                        disabled={!proc1}
                                        className={`relative p-4 rounded-lg border-2 text-left transition-all group ${selected?.selectedFrom === 1
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]'
                                            : 'bg-white border-blue-100 text-gray-600 hover:border-blue-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="text-xs uppercase font-bold mb-1 opacity-70">Examiner 1</div>
                                        <div className="text-3xl font-bold">{proc1 ? proc1.score : 'N/A'}</div>
                                        {selected?.selectedFrom === 1 && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Assessor 2 Option */}
                                    <button
                                        onClick={() => proc2 && selectScore(procName, 2, proc2.score)}
                                        disabled={!proc2}
                                        className={`relative p-4 rounded-lg border-2 text-left transition-all group ${selected?.selectedFrom === 2
                                            ? 'bg-green-600 border-green-600 text-white shadow-md transform scale-[1.02]'
                                            : 'bg-white border-green-100 text-gray-600 hover:border-green-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="text-xs uppercase font-bold mb-1 opacity-70">Examiner 2</div>
                                        <div className="text-3xl font-bold">{proc2 ? proc2.score : 'N/A'}</div>
                                        {selected?.selectedFrom === 2 && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total */}
                <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg flex justify-between items-center">
                    <div>
                        <span className="block text-gray-400 text-xs uppercase font-bold">Total Reconciled Score</span>
                        <span className="text-xs text-gray-500">Sum of all selected procedures</span>
                    </div>
                    <span className="text-4xl font-bold tracking-tight">{calculateTotal()}%</span>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Reconciliation Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-pink-500"
                        rows={3}
                        placeholder="Any notes about the reconciliation process..."
                    />
                </div>

                {/* Submit */}
                <div className="pt-6 flex gap-4 border-t border-gray-100">
                    <button
                        onClick={() => navigate('/obstetrician-assessment')}
                        className="flex-1 py-3 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending || !isComplete}
                        className="flex-1 py-3 bg-pink-600 text-white rounded font-bold hover:bg-pink-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitMutation.isPending ? 'Submitting...' : <><Save className="w-4 h-4" /> Submit Final Result</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ObstetricianReconciliation;
