import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ClipboardCheck } from 'lucide-react';
import { resultsService } from '../src/services/results.service';
import { programsService } from '../src/services/programs.service';

interface GroupedAssessment {
    studentId: number;
    indexNo: string;
    name: string;
    programShortName: string;
    practicalTasks: string[];
    carePlans: string[];
    careStudies: string[];
    obstetrician: string[];
}

const ExaminerAssessments: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('All');

    const { data: resultsData, isLoading } = useQuery({
        queryKey: ['my-assessments'],
        queryFn: () => resultsService.getAll({ limit: 10000, includeAll: true }),
    });

    const { data: programs = [] } = useQuery({
        queryKey: ['programs'],
        queryFn: () => programsService.getAll(),
    });

    const activePrograms = useMemo(() => {
        return programs.filter((p: any) => p.status === 'ACTIVE');
    }, [programs]);

    const groupedData = useMemo(() => {
        if (!resultsData?.results) return [];

        const map = new Map<number, GroupedAssessment>();

        resultsData.results.forEach((r: any) => {
            const sId = r.studentId;
            if (!map.has(sId)) {
                map.set(sId, {
                    studentId: sId,
                    indexNo: r.student?.indexNo || 'Unknown',
                    name: `${r.student?.lastname || ''} ${r.student?.othernames || ''}`.trim() || 'Unknown Candidate',
                    programShortName: r.student?.program?.shortName || r.student?.program?.name || 'Unknown',
                    practicalTasks: [],
                    carePlans: [],
                    careStudies: [],
                    obstetrician: []
                });
            }

            const group = map.get(sId)!;
            if (r.examType === 'PRACTICAL') {
                const title = r.task?.title || 'Unknown Task';
                if (!group.practicalTasks.includes(title)) group.practicalTasks.push(title);
            } else if (r.examType === 'CARE_PLAN') {
                const title = r.diagnosis || r.task?.title || 'Care Plan';
                if (!group.carePlans.includes(title)) group.carePlans.push(title);
            } else if (r.examType === 'CARE_STUDY') {
                const title = r.caseTitle || 'Care Study';
                if (!group.careStudies.includes(title)) group.careStudies.push(title);
            } else if (r.examType === 'OBSTETRICIAN') {
                const title = r.procedure || 'Procedure';
                if (!group.obstetrician.includes(title)) group.obstetrician.push(title);
            }
        });

        return Array.from(map.values());
    }, [resultsData]);

    const filteredData = useMemo(() => {
        return groupedData.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.indexNo.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesProgram = selectedProgram === 'All' || item.programShortName === selectedProgram;

            return matchesSearch && matchesProgram;
        });
    }, [groupedData, searchTerm, selectedProgram]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const renderPills = (items: string[], type: 'practical' | 'careplan' | 'other') => {
        if (items.length === 0) return <span className="text-gray-400 font-medium">-</span>;

        const colorClasses = {
            practical: 'bg-blue-100 text-blue-700 border-blue-200',
            careplan: 'bg-green-100 text-green-700 border-green-200',
            other: 'bg-purple-100 text-purple-700 border-purple-200'
        };

        return (
            <div className="flex flex-wrap gap-1.5">
                {items.map((item, idx) => (
                    <span key={idx} className={`px-2 py-1 rounded text-xs font-bold border ${colorClasses[type]}`}>
                        {item}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Assessments</h1>
                    <p className="text-gray-600 mt-1">Track the candidates and tasks you have evaluated</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by candidate name or index no..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        value={selectedProgram}
                        onChange={(e) => setSelectedProgram(e.target.value)}
                    >
                        <option value="All">All Programs</option>
                        {activePrograms.map((p: any) => (
                            <option key={p.id} value={p.shortName || p.name}>{p.shortName || p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Practical Tasks</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Care Plans</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Other (CS/Obs)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <ClipboardCheck className="w-12 h-12 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium text-gray-900">No assessments found</p>
                                            <p className="text-sm mt-1">You haven't graded any candidates matching this filter yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.studentId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 font-mono mb-0.5">{item.indexNo}</div>
                                            <div className="font-bold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-blue-600 font-medium mt-1">{item.programShortName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderPills(item.practicalTasks, 'practical')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderPills(item.carePlans, 'careplan')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderPills([...item.careStudies, ...item.obstetrician], 'other')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExaminerAssessments;
