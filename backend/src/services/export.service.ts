import prisma from '../config/database';
import { generateExcel, generatePDF } from '../utils/exportHelpers';

interface ExportFilters {
    programId?: number;
    dateFrom?: string;
    dateTo?: string;
}

export const exportService = {
    async gatherExportData(type: string, filters: ExportFilters = {}) {
        const examTypeMap: Record<string, string> = {
            'practical': 'PRACTICAL',
            'care_study': 'CARE_STUDY',
            'care_plan': 'CARE_PLAN',
            'obstetrician': 'OBSTETRICIAN'
        };

        const examType = examTypeMap[type] || 'PRACTICAL';

        // Build dynamic where clause
        const where: any = {
            examType: examType as any,
            deletedAt: null,
            OR: [
                { reconciliationId: null },
                { isFinalSubmission: true }
            ]
        };

        if (filters.programId) {
            where.student = { programId: filters.programId };
        }
        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
            if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
        }

        // Fetch results
        const results = await prisma.examResult.findMany({
            where,
            include: {
                student: { include: { program: true } },
                examiner: true,
                creator: true,
                task: true
            },
            orderBy: [
                { studentId: 'asc' },
                { createdAt: 'asc' }
            ]
        });


        // Group results by student so each student gets ONE row
        const studentMap = new Map<number, any>();

        for (const r of results) {
            const studentId = r.studentId;
            let examinerNames = r.examiner?.name || r.creator?.name || 'Unknown';
            const details = r.details as any;
            if (details?.assessor1Name && details?.assessor2Name) {
                examinerNames = `${details.assessor1Name}, ${details.assessor2Name}`;
            }

            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    studentId,
                    indexNo: r.student?.indexNo || 'N/A',
                    name: r.student ? `${r.student.lastname} ${r.student.othernames}` : 'Unknown',
                    program: typeof r.student?.program === 'object' ? (r.student.program as any).name : r.student?.program || 'N/A',
                    tasks: [],          // { label, score }
                    examinerName: examinerNames,
                    createdAt: r.createdAt.toISOString(),
                });
            }

            const group = studentMap.get(studentId);
            const taskLabel = examType === 'PRACTICAL'
                ? r.task?.title || 'Unknown Task'
                : r.caseTitle || r.diagnosis || r.procedure || 'Clinical Entry';

            // Avoid duplicate task entries (keep only final submission)
            if (!group.tasks.some((t: any) => t.label === taskLabel)) {
                group.tasks.push({ label: taskLabel, score: r.score });
            }
        }

        // Build the final export rows — one per student
        const exportData = Array.from(studentMap.values()).map(group => {
            const maxTasks = group.tasks.length || 1;
            const taskWeight = 0.8 / maxTasks;
            const prac80 = group.tasks.reduce((sum: number, t: any) => sum + t.score * taskWeight, 0);
            const finalScore = parseFloat(prac80.toFixed(1));
            const status = finalScore >= 67 ? 'PASS' : 'FAIL';

            const taskLabel = group.tasks
                .map((t: any, i: number) => `Task ${i + 1}: ${t.label} (${(t.score * taskWeight).toFixed(1)}/${(80 / maxTasks).toFixed(0)})`)
                .join(' | ');

            return {
                studentId: group.studentId,
                indexNo: group.indexNo,
                name: group.name,
                program: group.program,
                taskTitle: taskLabel,
                score: finalScore,
                status,
                examinerName: group.examinerName,
                createdAt: group.createdAt,
            };
        });

        return { exportData, examType };
    },

    async generateExcelBuffer(type: string, filters: ExportFilters = {}): Promise<string> {
        const { exportData, examType } = await this.gatherExportData(type, filters);
        const buffer = generateExcel(exportData, examType);
        return buffer.toString('base64');
    },

    async generatePdfBuffer(type: string, filters: ExportFilters = {}): Promise<string> {
        const { exportData, examType } = await this.gatherExportData(type, filters);
        const buffer = await generatePDF(exportData, examType);
        return buffer.toString('base64');
    }
};
