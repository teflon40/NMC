import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Trash2, Calendar, Filter, X } from 'lucide-react';
import { resultsService, ExamResult } from '../../src/services/results.service';
import { programsService } from '../../src/services/programs.service';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { useToast } from '../../src/context/ToastContext';
import { useExportJob } from '../../src/hooks/useExportJob';
import { exportToExcel, exportToPDF } from '../../src/utils/exportUtils';
import { GroupedPracticalResult, GroupedStudentResult } from './types';
import ResultDetailsModal from './shared/ResultDetailsModal';
import { Pagination } from '../../src/components/Pagination';

const PER_PAGE = 20;

const PracticalResultsTable: React.FC = () => {
    const { error: toastError, success } = useToast();
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [searched, setSearched] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedResult, setSelectedResult] = useState<GroupedPracticalResult | null>(null);

    const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: programsService.getAll });

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dayFilter, setDayFilter] = useState(''); // '' = all, '0'=Sun … '6'=Sat
    const hasActiveFilters = dateFrom || dateTo || dayFilter;

    // Build dynamic filename based on filters
    const baseFileName = useMemo(() => {
        let name = 'Practical_Results';
        if (selectedProgramId && programs.length) {
            const prog = programs.find(p => String(p.id) === String(selectedProgramId));
            if (prog) name += `_${prog.name.replace(/\s+/g, '_')}`;
        } else {
            name += '_All_Programs';
        }

        if (dateFrom && dateTo && dateFrom === dateTo) {
            const d = new Date(dateFrom);
            const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/[, ]+/g, '_');
            name += `_${dateStr}`;
        } else if (dateFrom || dateTo) {
            name += '_Filtered_By_Date';
        }
        return name;
    }, [selectedProgramId, dateFrom, dateTo, programs]);

    const { handleExportExcel: asyncExportExcel, handleExportPDF: asyncExportPDF } = useExportJob(
        'practical',
        baseFileName,
        {
            programId: selectedProgramId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }
    );

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { },
    });

    const { data: assessmentTypes = [] } = useQuery({
        queryKey: ['assessment-types-links'],
        queryFn: async () => {
            const { assessmentTypesService } = await import('../../src/services/assessmentTypes.service');
            return assessmentTypesService.getAll();
        },
    });

    const carePlanType = assessmentTypes.find((t: any) => t.code === 'CARE_PLAN');
    const eligibleProgramIds: number[] = carePlanType?.programLinks?.map((l: any) => l.program?.id || l.programId) || [];

    const { data: resultsData, isLoading, refetch } = useQuery({
        queryKey: ['flat-results', 'practical', searched, selectedProgramId],
        queryFn: async () => {
            const [prac, cp] = await Promise.all([
                resultsService.getAll({ examType: 'PRACTICAL', includeAll: true, limit: 100000 }),
                resultsService.getAll({ examType: 'CARE_PLAN', includeAll: true, limit: 100000 }),
            ]);
            return { results: [...prac.results, ...cp.results] };
        },
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

        // Date / day pre-filter: keep only results within the selected window
        if (dateFrom || dateTo || dayFilter) {
            list = list.filter(r => {
                if (!r.createdAt) return true;
                const d = new Date(r.createdAt);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo) {
                    const end = new Date(dateTo);
                    end.setHours(23, 59, 59, 999);
                    if (d > end) return false;
                }
                if (dayFilter !== '' && d.getDay() !== Number(dayFilter)) return false;
                return true;
            });
        }

        const grouped = new Map<string, GroupedPracticalResult>();
        list.forEach(r => {
            const indexNo = r.student?.indexNo;
            if (!indexNo) return;
            if (!grouped.has(indexNo)) {
                const programObj = typeof r.student?.program === 'object' ? (r.student.program as any) : null;
                const programName = programObj ? programObj.name : r.student?.program ?? '—';
                grouped.set(indexNo, {
                    id: r.id, resultIds: [], indexNo,
                    lastname: r.student?.lastname ?? '',
                    othernames: r.student?.othernames ?? '',
                    name: r.student ? `${r.student.lastname} ${r.student.othernames}` : '—',
                    program: programName,
                    programId: r.student?.programId || (programObj?.id) || null,
                    maxTasks: programObj?.maxTasks || 2,
                    maxCarePlans: programObj?.maxCarePlans || 2,
                    currentLevel: r.student?.level || 'Year 1',
                    cpTopics: [], cpTotalScore: 0, pracTasks: [], pracRawScores: [], pracTotalScore: 0, scoredBy: null, results: [],
                });
            }
            const group = grouped.get(indexNo)!;
            group.resultIds.push(r.id);

            // Only show final/single practical results in the modal — skip raw dual-assessor drafts
            const isDisplayable = r.examType === 'PRACTICAL'
                ? (!r.reconciliationId || r.isFinalSubmission === true)
                : true; // Care Plans always display

            if (isDisplayable) {
                group.results.push({
                    ...r,
                    taskLabel: r.examType === 'PRACTICAL' ? '' : 'Care Plan',
                    taskTitle: r.task?.title,
                    examinerName: r.creator?.name || r.examiner?.name || 'Unknown',
                    examinerEmail: r.examiner?.email || (r.creator as any)?.username || '',
                    academicYear: r.academicYear || (r.details as any)?.academicYear || 'Unknown Year',
                    studentLevel: r.studentLevel || (r.details as any)?.studentLevel || 'Unknown Level',
                } as any);
            }

            if (r.examType === 'PRACTICAL') {
                if (r.isFinalSubmission || !r.reconciliationId) {
                    const rawScore = Number(r.score || 0);
                    group.pracRawScores.push(rawScore);
                    if (r.task?.title) group.pracTasks.push({ title: r.task.title, score: rawScore });
                    if (!group.scoredBy && r.reconciledByCreator?.name) group.scoredBy = r.reconciledByCreator.name;
                    else if (!group.scoredBy && r.creator?.name) group.scoredBy = r.creator.name;
                }
            } else if (r.examType === 'CARE_PLAN') {
                const cpScore = Number(r.score || 0);
                group.cpTotalScore += cpScore;
                group.cpTopics.push({ title: r.task?.title ?? r.diagnosis ?? r.caseTitle ?? 'Care Plan', score: cpScore });
            }
        });

        // Ensure chronological order for Tasks and Care Plans
        grouped.forEach(g => {
            g.results.reverse();
            g.pracRawScores.reverse();
            g.pracTasks.reverse();
            g.cpTopics.reverse();

            // Re-assign correct practical task labels
            let pracCounter = 1;
            g.results.forEach((res: any) => {
                if (res.examType === 'PRACTICAL') {
                    res.taskLabel = `Task ${pracCounter++}`;
                }
            });
        });

        return Array.from(grouped.values()).map(g => {
            const isEligible = eligibleProgramIds.length === 0 || (g.programId !== null && eligibleProgramIds.includes(Number(g.programId)));
            const maxTasks = g.maxTasks || 2;
            const maxCarePlans = g.maxCarePlans || 2;

            const taskWeight = isEligible ? (0.8 / maxTasks) : (1.0 / maxTasks);
            const taskMax = isEligible ? (80 / maxTasks) : (100 / maxTasks);

            // Apply correct weight to each task score
            const pracTasks = g.pracTasks.map(t => ({
                title: t.title,
                score: Number(t.score) * taskWeight,
                maxScore: taskMax,
            }));
            const prac = g.pracRawScores.reduce((sum, s) => sum + s * taskWeight, 0);
            const cp20 = isEligible ? g.cpTotalScore / maxCarePlans : 0;
            const finalScore = isEligible ? cp20 + prac : prac; // 50+50=100 directly for ineligible
            return {
                ...g,
                pracTasks,                           // use the reweighted tasks
                count: g.results.length,
                examType: 'PRACTICAL',
                cp20: isEligible ? cp20.toFixed(1) : 'N/A',
                prac80: prac.toFixed(1),
                finalScore: finalScore.toFixed(1),
                finalScoreType: (() => {
                    if (isEligible) {
                        const pracPct = Math.round(80 / maxTasks);
                        const taskParts = Array(maxTasks).fill(`${pracPct}%`).join(' + ');
                        return `20% + ${taskParts}`;
                    } else {
                        const pracPct = Math.round(100 / maxTasks);
                        return Array(maxTasks).fill(`${pracPct}%`).join(' + ');
                    }
                })(),
                scores: finalScore.toFixed(1),
                scoredBy: g.scoredBy || '—',
            };
        });
    }, [allResults, selectedProgramId, tableSearch, dateFrom, dateTo, dayFilter, eligibleProgramIds]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleDelete = (resultIds: number[]) => {
        setConfirmModal({
            isOpen: true, title: 'Delete Result(s)',
            message: 'Are you sure you want to delete this assessment record? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    for (const id of resultIds) {
                        try { await resultsService.delete(id); } catch (e: any) { if (e?.response?.status !== 404) throw e; }
                    }
                    if (selectedResult) setSelectedResult(null);
                    refetch(); success('Result(s) deleted successfully');
                } catch { toastError('Failed to delete result.'); }
                finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
            },
        });
    };

    const handleSyncExportExcel = () => {
        const data = rows.map(r => ({
            'Index No.': r.indexNo, 'Name': r.name, 'Program': r.program,
            'Care Plan Topics': r.cpTopics.map(t => `${t.title} (${t.score}/20)`).join(', ') || 'N/A',
            'CP 20%': r.cp20 || '0.0', 'Practical Tasks': r.pracTasks.map(t => `${t.title} (${t.score}/${t.maxScore ?? 40})`).join(', ') || 'N/A',
            'Prac 80%': r.prac80 || '0.0', 'Final Score (100%)': `${r.finalScore}%`, 'Scored By': r.scoredBy,
        }));
        exportToExcel(data, baseFileName);
    };

    const handleSyncExportPDF = () => {
        const cols = ['Index No.', 'Name', 'Program', 'CP (20%)', 'Prac (80%)', 'Final Score', 'Scored By'];
        const data = rows.map(r => ({ 'Index No.': r.indexNo, 'Name': r.name, 'Program': r.program, 'CP (20%)': r.cp20 || '0.0', 'Prac (80%)': r.prac80 || '0.0', 'Final Score': `${r.finalScore}%`, 'Scored By': r.scoredBy }));
        exportToPDF(cols, data, 'Practical Results', baseFileName);
    };

    return (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
                onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))} />

            {/* Search Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Practical Results
                </h2>
                <div className="flex gap-3 items-end flex-wrap">
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

                {/* Date / Day Filters */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by Date / Day</span>
                        {hasActiveFilters && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); setDayFilter(''); setPage(1); }}
                                className="ml-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold">
                                <X className="w-3 h-3" /> Clear filters
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">From</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">To</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Day of Week</label>
                            <select value={dayFilter} onChange={e => { setDayFilter(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
                                <option value="">All Days</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="0">Sunday</option>
                            </select>
                        </div>
                        {hasActiveFilters && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-semibold">
                                <Filter className="w-3 h-3" />
                                {rows.length} result{rows.length !== 1 ? 's' : ''} matching filters
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {searched && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Students Results Table</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={handleSyncExportExcel} className="border border-blue-400 text-blue-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-50">EXCEL</button>
                            <button onClick={handleSyncExportPDF} className="border border-blue-400 text-blue-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-50">PDF</button>
                            <button onClick={() => asyncExportExcel && asyncExportExcel()} className="border border-green-400 text-green-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-green-50">BG EXCEL</button>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">SEARCH:</span>
                                <input type="text" value={tableSearch} onChange={e => { setTableSearch(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded pl-16 pr-3 py-1.5 text-sm w-44 focus:outline-none focus:border-blue-400" />
                            </div>
                        </div>
                    </div>

                    {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left min-w-[900px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {['Index No.', 'Name', 'Program', 'Care Plan Topics', 'CP (20%)', 'Practical Tasks', 'Prac (80%)', 'Final Score', 'Scored By', 'Actions'].map(h => (
                                            <th key={h} className="py-3 px-3 font-bold text-gray-500 uppercase tracking-wider text-center first:text-left">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={10} className="py-10 text-center text-gray-400 italic">No data available</td></tr>
                                    ) : pageRows.map(row => (
                                        <tr key={row.id} onClick={() => setSelectedResult(row as unknown as GroupedPracticalResult)}
                                            className="hover:bg-blue-50 group cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                                            <td className="py-3 px-3 font-mono text-gray-700">{row.indexNo}</td>
                                            <td className="py-3 px-3 text-gray-800"><div className="w-24 truncate" title={row.name}>{row.name}</div></td>
                                            <td className="py-3 px-3 text-gray-600"><div className="min-w-[12rem] break-words">{row.program}</div></td>
                                            <td className="py-3 px-3 text-gray-600 text-[11px]">
                                                {row.cpTopics.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {row.cpTopics.map((t, i) => (
                                                            <div key={i} className="flex justify-between min-w-[10rem] gap-2">
                                                                <span className="break-words uppercase">{t.title}</span>
                                                                <span className="font-semibold text-gray-800 whitespace-nowrap">{Number(t.score).toFixed(1)}/20</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-gray-400">N/A</span>}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-100">{row.cp20 || '0'}</span>
                                            </td>
                                            <td className="py-3 px-3 text-gray-600 text-[11px]">
                                                {row.pracTasks.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {row.pracTasks.map((t, i) => (
                                                            <div key={i} className="flex justify-between min-w-[14rem] gap-2">
                                                                <span className="break-words uppercase">{t.title}</span>
                                                                <span className="font-semibold text-gray-800 whitespace-nowrap">{Number(t.score).toFixed(1)}/{t.maxScore ?? 40}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-gray-400">N/A</span>}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-100">{row.prac80 || '0'}</span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className={`px-2 py-1 rounded font-bold text-sm ${Number(row.finalScore) >= 67 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {row.finalScore}%
                                                </span>
                                                <div className="text-[10px] text-gray-400 mt-1">{row.finalScoreType}</div>
                                            </td>
                                            <td className="py-3 px-3 text-center text-[10px] uppercase text-gray-600 font-semibold max-w-[8rem] break-words">{row.scoredBy}</td>
                                            <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(row.resultIds)}
                                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={rows.length}
                        limit={PER_PAGE}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {/* Full details modal for selected student */}
            {selectedResult && (
                <ResultDetailsModal
                    result={selectedResult as unknown as GroupedStudentResult}
                    onClose={() => setSelectedResult(null)}
                    onDelete={(id, e) => { e.stopPropagation(); handleDelete([id]); }}
                />
            )}
        </div>
    );
};

export default PracticalResultsTable;
