import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Trash2 } from 'lucide-react';
import { resultsService } from '../../src/services/results.service';
import { programsService } from '../../src/services/programs.service';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { useToast } from '../../src/context/ToastContext';
import { useExportJob } from '../../src/hooks/useExportJob';

const PER_PAGE = 20;

const CareStudyResultsTable: React.FC = () => {
    const { error: toastError, success } = useToast();
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [searched, setSearched] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [page, setPage] = useState(1);
    const { handleExportExcel, handleExportPDF } = useExportJob('care_study');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { },
    });

    const { data: programs = [] } = useQuery({
        queryKey: ['programs'],
        queryFn: programsService.getAll,
    });

    const { data: resultsData, isLoading, refetch } = useQuery({
        queryKey: ['flat-results', 'care_study', searched, selectedProgramId],
        queryFn: () => resultsService.getAll({ examType: 'CARE_STUDY', includeAll: true, limit: 100000 }),
        enabled: searched,
    });

    const allResults = resultsData?.results ?? [];

    const rows = useMemo(() => {
        let list = allResults;
        if (selectedProgramId) list = list.filter(r => String(r.student?.programId) === String(selectedProgramId));
        if (tableSearch) {
            const lower = tableSearch.toLowerCase();
            list = list.filter(r =>
                r.student?.indexNo?.toLowerCase().includes(lower) ||
                r.student?.lastname?.toLowerCase().includes(lower) ||
                r.student?.othernames?.toLowerCase().includes(lower)
            );
        }
        return list.map(r => ({
            id: r.id,
            resultIds: [r.id],
            indexNo: r.student?.indexNo ?? '—',
            name: r.student ? `${r.student.lastname} ${r.student.othernames}` : '—',
            program: typeof r.student?.program === 'object' ? r.student.program.name : r.student?.program ?? '—',
            scores: r.score,
            caseTitle: r.caseTitle ?? r.diagnosis ?? '—',
            scoredBy: r.examiner?.name ?? r.creator?.name ?? '—',
            creator: r.creator,
            reconciledByCreator: r.reconciledByCreator,
        }));
    }, [allResults, selectedProgramId, tableSearch]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleDelete = (resultIds: number[]) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Result',
            message: 'Are you sure you want to delete this result? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    for (const id of resultIds) {
                        try { await resultsService.delete(id); } catch (e: any) { if (e?.response?.status !== 404) throw e; }
                    }
                    refetch();
                    success('Result(s) deleted successfully');
                } catch { toastError('Failed to delete result.'); }
                finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
            },
        });
    };

    return (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
                onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Care Study Results
                </h2>
                <div className="flex gap-3 items-end">
                    <select value={selectedProgramId} onChange={e => { setSelectedProgramId(e.target.value); setSearched(false); setPage(1); }}
                        className="flex-1 max-w-xs border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                        <option value="">— Select Programme —</option>
                        {programs.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                    <button onClick={() => { setSearched(true); setPage(1); }}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded font-bold text-sm uppercase">
                        <Search className="w-4 h-4" /> Search
                    </button>
                </div>
            </div>

            {searched && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Results
                        </h3>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExportExcel} className="border border-blue-400 text-blue-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-50">EXCEL</button>
                            <button onClick={handleExportPDF} className="border border-blue-400 text-blue-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-50">PDF</button>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">SEARCH:</span>
                                <input type="text" value={tableSearch} onChange={e => { setTableSearch(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded pl-16 pr-3 py-1.5 text-sm w-44 focus:outline-none focus:border-blue-400" />
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[500px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Index No.</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Program</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Case / Diagnosis</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Score</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Scored By</th>
                                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pageRows.length === 0 ? (
                                        <tr><td colSpan={7} className="py-10 text-center text-gray-400 italic">No data available</td></tr>
                                    ) : pageRows.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50 group">
                                            <td className="py-3 px-4 font-mono text-gray-700">{row.indexNo}</td>
                                            <td className="py-3 px-4 text-gray-800">{row.name}</td>
                                            <td className="py-3 px-4 text-gray-600">{row.program}</td>
                                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.caseTitle}>{row.caseTitle}</td>
                                            <td className="py-3 px-4 font-semibold text-gray-900">{row.scores}%</td>
                                            <td className="py-3 px-4 text-gray-600 uppercase text-xs">{row.scoredBy}</td>
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => handleDelete(row.resultIds)}
                                                    className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                        <span>Showing {rows.length === 0 ? 0 : (page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, rows.length)} of {rows.length} entries</span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40">Previous</button>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CareStudyResultsTable;
