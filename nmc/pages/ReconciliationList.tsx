import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resultsService } from '../src/services/results.service';
import { AlertCircle, CheckCircle, ChevronRight, User, ClipboardList, Clock } from 'lucide-react';

const ReconciliationList: React.FC = () => {
    const navigate = useNavigate();


    const [activeTab, setActiveTab] = React.useState<'pending' | 'completed'>('pending');

    const { data: pending = [], isLoading: isLoadingPending } = useQuery({
        queryKey: ['pending-reconciliations'],
        queryFn: () => resultsService.getPendingReconciliations(),
    });

    const { data: completedData, isLoading: isLoadingCompleted } = useQuery({
        queryKey: ['completed-reconciliations'],
        queryFn: () => resultsService.getAll({ examType: 'PRACTICAL', limit: 50 }),
        enabled: activeTab === 'completed'
    });

    const completed = completedData?.results || [];

    const isLoading = activeTab === 'pending' ? isLoadingPending : isLoadingCompleted;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Reconciliations</h1>
                <p className="text-gray-600">Manage and review practical assessment reconciliations.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'pending'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Pending ({pending.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'completed'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Completed Logic
                </button>
            </div>

            {activeTab === 'pending' ? (
                pending.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">All Caught Up!</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            There are no pending reconciliations requiring your attention at this time.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {pending.map((item: any) => (
                            <div key={item.reconciliationId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">
                                                {item.student?.surname} {item.student?.otherNames}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                <span className="text-sm font-medium text-blue-600 flex items-center gap-1.5">
                                                    <ClipboardList className="w-4 h-4" />
                                                    {item.task?.title}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    ID: {item.student?.indexNo}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 md:border-l md:pl-6">
                                        <div className="text-sm">
                                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                                                <Clock className="w-4 h-4" />
                                                <span>Pending since {new Date(item.assessments[0].createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                                                    {item.assessments[0].creator?.name || 'Assessor 1'}
                                                </span>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                                                    {item.assessments[1].creator?.name || 'Assessor 2'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/practical-reconciliation/${item.reconciliationId}`)}
                                            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
                                        >
                                            Reconcile Now
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Student</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Task</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Assessors</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Reconciled By</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {completed.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No completed reconciliations found.
                                    </td>
                                </tr>
                            ) : (
                                completed.map((result: any) => (
                                    <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{result.student?.lastname} {result.student?.othernames}</div>
                                            <div className="text-xs text-gray-500 font-mono">{result.student?.indexNo}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{result.task?.title || 'Unknown Task'}</div>
                                            <div className="text-xs text-gray-500">{new Date(result.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-bold text-gray-400 uppercase mr-1">1:</span>
                                                    {result.details?.assessor1Name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-bold text-gray-400 uppercase mr-1">2:</span>
                                                    {result.details?.assessor2Name || 'Unknown'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {result.examiner?.name?.charAt(0) || result.creator?.name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {result.examiner?.name || result.creator?.name || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${result.score >= 67 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {result.score}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


export default ReconciliationList;
