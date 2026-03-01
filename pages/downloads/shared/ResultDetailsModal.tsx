import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { GroupedStudentResult, ExamResultWithMeta } from '../types';
import { groupResultsByYear, getScoreBadgeColor } from '../../../src/utils/tableUtils';
import { useAuth } from '../../../src/context/AuthContext';
import { useToast } from '../../../src/context/ToastContext';
import { resultsService } from '../../../src/services/results.service';

interface ResultDetailsModalProps {
    result: GroupedStudentResult;
    onClose: () => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
}

const ResultDetailsModal: React.FC<ResultDetailsModalProps> = ({ result, onClose, onDelete }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMINISTRATOR';
    const { success: toastSuccess, error: toastError } = useToast();
    const [resettingId, setResettingId] = useState<string | null>(null);

    const handleResetReconciliation = async (reconciliationId: string) => {
        setResettingId(reconciliationId);
        try {
            await resultsService.resetReconciliation(reconciliationId);
            toastSuccess('Reconciliation has been reset. The examiners will see it as pending and can redo it.');
            onClose();
        } catch (err: any) {
            toastError(err?.response?.data?.error || 'Failed to reset reconciliation');
        } finally {
            setResettingId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-gray-800">Assessment Details</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="block text-xs font-bold text-gray-400 uppercase">Candidate</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-500">{result.program}</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900 block">{result.name}</span>
                            <span className="text-sm text-gray-500 font-mono">{result.indexNo}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Final Score</span>
                            <span className={`text-3xl font-bold ${Number((result as any).finalScore ?? result.avgScore ?? 0) >= 67 ? 'text-green-600' : 'text-red-500'}`}>
                                {(result as any).finalScore ?? result.avgScore ?? '—'}%
                            </span>
                            {(() => {
                                const score = Number((result as any).finalScore ?? result.avgScore ?? 0);
                                const passed = score >= 67;
                                return (
                                    <span className={`mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {passed ? '✓ PASSED' : '✗ FAILED'}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Grouped by Year */}
                    <div className="space-y-8">
                        {groupResultsByYear(result.results as any[]).map((group) => (
                            <div key={group.year} className="relative">
                                <div className="sticky top-0 bg-white z-0 pb-2 border-b border-gray-100 mb-4 flex items-center gap-3">
                                    <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{group.year}</div>
                                    <span className="text-sm font-medium text-gray-400 capitalize">Academic Year History</span>
                                </div>

                                <div className="space-y-4">
                                    {group.items.map((r: ExamResultWithMeta) => (
                                        <div key={r.id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-white shadow-sm relative overflow-hidden">


                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                                            {r.taskLabel}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString()}
                                                        </span>
                                                    </div>

                                                    <h5 className="font-bold text-gray-800 text-lg mb-1 leading-tight">
                                                        {r.examType === 'PRACTICAL' ? r.taskTitle : (r.caseTitle || r.diagnosis || r.procedure || 'Untitled')}
                                                    </h5>

                                                    <div className="flex flex-col gap-1 mt-3 text-sm text-gray-600">
                                                        {r.details?.reconciled ? (
                                                            <>
                                                                <div className="flex gap-4">
                                                                    <div>
                                                                        <span className="font-bold text-gray-400 text-[10px] uppercase mr-1">Assessor 1:</span>
                                                                        {(r.details as any)?.assessor1Name || 'Unknown'}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-bold text-gray-400 text-[10px] uppercase mr-1">Assessor 2:</span>
                                                                        {(r.details as any)?.assessor2Name || 'Unknown'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                                    <div>
                                                                        <span className="font-bold text-blue-400 text-[10px] uppercase mr-1">Reconciled By:</span>
                                                                        <span className="text-blue-600 font-medium">{r.examinerName}</span>
                                                                    </div>
                                                                    {isAdmin && (r as any).reconciliationId && r.examType === 'PRACTICAL' && (
                                                                        <button
                                                                            onClick={() => handleResetReconciliation((r as any).reconciliationId)}
                                                                            disabled={resettingId === (r as any).reconciliationId}
                                                                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
                                                                        >
                                                                            <RefreshCw className={`w-3 h-3 ${resettingId === (r as any).reconciliationId ? 'animate-spin' : ''}`} />
                                                                            {resettingId === (r as any).reconciliationId ? 'Resetting...' : 'Re-do Reconciliation'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div>
                                                                <span className="font-bold text-gray-400 text-xs uppercase mr-1">Examiner:</span>
                                                                {r.examinerName}
                                                            </div>
                                                        )}

                                                        {r.reconciliationNotes && (
                                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                                <span className="font-bold text-blue-500 text-[10px] uppercase block mb-1">Reconciliation Notes</span>
                                                                <p className="text-sm text-blue-800">{r.reconciliationNotes}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Procedure Breakdown — only for individual PRACTICAL results */}
                                                    {r.examType === 'PRACTICAL' && r.task?.procedures && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <details className="group">
                                                                <summary className="text-xs font-bold text-blue-600 cursor-pointer hover:underline list-none flex items-center gap-1 select-none w-fit">
                                                                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                                                                    View Procedure Ratings
                                                                </summary>
                                                                <div className="mt-3 overflow-x-auto">
                                                                    <table className="w-full text-left text-sm">
                                                                        <thead>
                                                                            <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-400 font-bold bg-gray-50">
                                                                                <th className="py-2 px-3 rounded-tl-lg">Step</th>
                                                                                <th className="py-2 px-3">Procedure</th>
                                                                                {r.details?.reconciled && (
                                                                                    <>
                                                                                        <th className="py-2 px-3 text-center">Assessor 1</th>
                                                                                        <th className="py-2 px-3 text-center">Assessor 2</th>
                                                                                    </>
                                                                                )}
                                                                                <th className={`py-2 px-3 text-center ${r.details?.reconciled ? 'text-blue-500 rounded-tr-lg' : 'rounded-tr-lg'}`}>
                                                                                    {r.details?.reconciled ? 'Final Mark' : 'Score'}
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-50">
                                                                            {r.task.procedures.map((proc) => {
                                                                                const isReconciled = r.details?.reconciled;
                                                                                const a1Score = isReconciled ? ((r.details as any)?.procedures?.[proc.id]?.assessor1Score ?? '-') : undefined;
                                                                                const a2Score = isReconciled ? ((r.details as any)?.procedures?.[proc.id]?.assessor2Score ?? '-') : undefined;
                                                                                const rating = (r.details as any)?.procedureScores?.[proc.stepNumber] ??
                                                                                    (r.details as any)?.procedures?.[proc.id]?.score ??
                                                                                    (r.details as any)?.[proc.id];

                                                                                return (
                                                                                    <tr key={proc.stepNumber} className="hover:bg-blue-50/30 transition-colors">
                                                                                        <td className="py-2 px-3 align-top">
                                                                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${rating !== undefined ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                                                {proc.stepNumber}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2 px-3 align-top text-gray-600">
                                                                                            {proc.description}
                                                                                        </td>
                                                                                        {isReconciled && (
                                                                                            <>
                                                                                                <td className="py-2 px-3 align-top text-center font-medium text-gray-500">
                                                                                                    {a1Score}
                                                                                                </td>
                                                                                                <td className="py-2 px-3 align-top text-center font-medium text-gray-500">
                                                                                                    {a2Score}
                                                                                                </td>
                                                                                            </>
                                                                                        )}
                                                                                        <td className={`py-2 px-3 align-top text-center font-bold ${rating !== undefined ? (isReconciled ? 'text-blue-600' : 'text-gray-900') : 'text-gray-300'}`}>
                                                                                            {rating !== undefined ? rating : '-'}
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-end gap-3 pl-4 border-l border-gray-100">
                                                    <div className="text-right">
                                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Score</span>
                                                        {r.examType === 'PRACTICAL' ? (() => {
                                                            const maxTasks = (result as any).maxTasks || 2;
                                                            const isEligible = (result as any).cp20 !== 'N/A';
                                                            const weight = isEligible ? (0.8 / maxTasks) : (1.0 / maxTasks);
                                                            const maxRaw = isEligible ? (80 / maxTasks) : (100 / maxTasks);
                                                            const max = Number.isInteger(maxRaw) ? maxRaw : parseFloat(maxRaw.toFixed(1));
                                                            const pts = (Number(r.score) * weight).toFixed(1);
                                                            return (
                                                                <span className={`inline-block px-3 py-1 rounded-md text-xl font-bold border ${getScoreBadgeColor(r.score)}`}>
                                                                    {pts}/{max}
                                                                </span>
                                                            );
                                                        })() : (
                                                            <span className={`inline-block px-3 py-1 rounded-md text-xl font-bold border ${getScoreBadgeColor(r.score)}`}>
                                                                {r.score}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => onDelete(r.id, e)}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all mt-2"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultDetailsModal;
