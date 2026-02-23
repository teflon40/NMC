import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resultsService, ExamResult } from '../src/services/results.service';
import { Search, Filter, Download, CheckCircle2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { exportToExcel } from '../src/utils/exportUtils';

const AdminResults: React.FC = () => {
    const [filterExamType, setFilterExamType] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    const { data, isLoading } = useQuery({
        queryKey: ['results', filterExamType, page],
        queryFn: async () => {
            const response = await resultsService.getAll({
                examType: filterExamType === 'ALL' ? undefined : filterExamType as any,
                page,
                limit
            });
            return response;
        }
    });

    const results = data?.results || [];
    const pagination = data?.pagination;

    const filteredResults = useMemo(() => {
        let res = results;
        if (filterExamType !== 'ALL') {
            res = res.filter(r => r.examType === filterExamType);
        }
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            res = res.filter(r =>
                (r.student?.lastname || '').toLowerCase().includes(lower) ||
                (r.student?.othernames || '').toLowerCase().includes(lower) ||
                (r.student?.indexNo || '').toLowerCase().includes(lower) ||
                (r.caseTitle || '').toLowerCase().includes(lower) ||
                (r.diagnosis || '').toLowerCase().includes(lower) ||
                (r.procedure || '').toLowerCase().includes(lower)
            );
        }

        return res;
    }, [results, filterExamType, searchQuery]);

    const handleExport = () => {
        const dataToExport = filteredResults.map(r => ({
            'Date': format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
            'Student Name': r.student ? `${r.student.lastname} ${r.student.othernames}` : 'Unknown',
            'Index No': r.student?.indexNo || 'N/A',
            'Exam Type': r.examType,
            'Task/Title': r.task?.title || r.caseTitle || r.diagnosis || r.procedure || '',
            'Score': `${r.score}%`
        }));
        exportToExcel(dataToExport, 'Exam_Results');
    };

    const getScoreBadgeColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800';
        if (score >= 67) return 'bg-green-100 text-green-800';
        return 'bg-red-100 text-red-800';
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading results...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-gray-700 font-bold text-sm uppercase flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        Examination Results
                    </h2>
                    <button
                        onClick={handleExport}
                        className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-green-700 transition"
                    >
                        <Download className="w-4 h-4" /> Export CSV/Excel
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <label className="text-sm font-bold text-gray-600">FILTER BY:</label>
                            <select
                                value={filterExamType}
                                onChange={(e) => setFilterExamType(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="ALL">All Examinations</option>
                                <option value="PRACTICAL">Practical Exams</option>
                                <option value="CARE_STUDY">Care Study</option>
                                <option value="CARE_PLAN">Care Plan</option>
                                <option value="OBSTETRICIAN">Obstetrician</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-gray-600 text-sm font-medium">SEARCH:</span>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Index No. or Name"
                                    className="border border-gray-300 rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50">
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Student</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Exam Type</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Details</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Assessor 1</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Assessor 2</th>
                                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredResults.map((result) => {
                                    const isReconciled = result.details?.reconciled;
                                    const assessor1Name = result.details?.assessor1Name;
                                    const assessor2Name = result.details?.assessor2Name;
                                    const reconcilerName = result.creator?.name || 'Unknown';

                                    return (
                                        <tr key={result.id} className="hover:bg-gray-50">
                                            <td className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">
                                                {format(new Date(result.createdAt), 'MMM d, yyyy HH:mm')}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {result.student ? `${result.student.lastname} ${result.student.othernames}` : 'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {result.student?.indexNo || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">
                                                    {result.examType}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-600">
                                                {result.examType === 'PRACTICAL' && result.task && (
                                                    <span title={result.task.title}>Task: {result.task.title.substring(0, 30)}...</span>
                                                )}
                                                {result.examType === 'CARE_STUDY' && (
                                                    <span title={result.caseTitle}>{result.caseTitle?.substring(0, 30)}...</span>
                                                )}
                                                {result.examType === 'CARE_PLAN' && (
                                                    <span title={result.diagnosis}>{result.diagnosis?.substring(0, 30)}...</span>
                                                )}
                                                {result.examType === 'OBSTETRICIAN' && (
                                                    <span title={result.procedure}>{result.procedure?.substring(0, 30)}...</span>
                                                )}
                                            </td>

                                            {/* Assessor 1 */}
                                            <td className="py-4 px-4 text-center">
                                                {isReconciled ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Assessor 1</span>
                                                        <span className="text-xs font-medium text-gray-700">{assessor1Name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Assessor 2 */}
                                            <td className="py-4 px-4 text-center">
                                                {isReconciled ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Assessor 2</span>
                                                        <span className="text-xs font-medium text-gray-700">{assessor2Name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Final Result & Reconciler */}
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreBadgeColor(result.score)}`}>
                                                        {result.score}%
                                                    </span>
                                                    {isReconciled && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-black uppercase text-blue-500 mt-1">Reconciled By</span>
                                                            <span className="text-[10px] font-bold text-blue-700 leading-tight">{reconcilerName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredResults.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500 italic">No results found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminResults;
