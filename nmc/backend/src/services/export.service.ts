import prisma from '../config/database';
import { generateExcel, generatePDF } from '../utils/exportHelpers';

export const exportService = {
    async gatherExportData(type: string) {
        const examTypeMap: Record<string, string> = {
            'practical': 'PRACTICAL',
            'care_study': 'CARE_STUDY',
            'care_plan': 'CARE_PLAN',
            'obstetrician': 'OBSTETRICIAN'
        };

        const examType = examTypeMap[type] || 'PRACTICAL';

        // Fetch results hiding softly deleted exams
        const results = await prisma.examResult.findMany({
            where: {
                examType: examType as any,
                deletedAt: null,
                OR: [
                    { reconciliationId: null },
                    { isFinalSubmission: true }
                ]
            },
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

        // Transform data
        const exportData = results.map((r: any) => {
            let examinerNames = r.examiner?.name || r.creator?.name || 'Unknown';
            if (r.details?.assessor1Name && r.details?.assessor2Name) {
                examinerNames = `${r.details.assessor1Name}, ${r.details.assessor2Name}`;
            }

            return {
                studentId: r.studentId,
                indexNo: r.student?.indexNo || 'N/A',
                name: r.student ? `${r.student.lastname} ${r.student.othernames}` : 'Unknown',
                program: typeof r.student?.program === 'object' ? (r.student.program as any).name : r.student?.program || 'N/A',
                taskTitle: r.task?.title,
                caseTitle: r.caseTitle,
                diagnosis: r.diagnosis,
                procedure: r.procedure,
                score: r.score,
                status: r.score >= 67 ? 'PASS' : 'FAIL',
                examinerName: examinerNames,
                createdAt: r.createdAt.toISOString()
            };
        });

        return { exportData, examType };
    },

    async generateExcelBuffer(type: string): Promise<string> {
        const { exportData, examType } = await this.gatherExportData(type);
        const buffer = generateExcel(exportData, examType);
        return buffer.toString('base64');
    },

    async generatePdfBuffer(type: string): Promise<string> {
        const { exportData, examType } = await this.gatherExportData(type);
        const buffer = await generatePDF(exportData, examType);
        return buffer.toString('base64');
    }
};
