import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

interface ExportResult {
    studentId: number;
    indexNo: string;
    name: string;
    program: string;
    taskTitle?: string;
    caseTitle?: string;
    diagnosis?: string;
    procedure?: string;
    score: number;
    status?: string;       // PASS or FAIL
    examinerName: string;  // May contain two names separated by comma
    createdAt: string;
}

// Helper to format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

export const generateExcel = (results: ExportResult[], examType: string): Buffer => {
    // Create worksheet data
    const data: any[] = [];

    // Title Row
    data.push([`NMC ASSESSMENT RESULTS - ${examType.replace('_', ' ')}`]);
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    data.push([`Generated on: ${dateStr}`]);
    data.push([`Pass Mark: 67%`]);
    data.push([]); // Empty row for spacing

    // Header Row
    const headers = ['S/N', 'Index No.', 'Student Name', 'Program', 'Tasks (Weighted Score)', 'Final Score (80%)', 'Status', 'Examiner(s)', 'Date'];
    data.push(headers);

    let sn = 1;

    // Sort by student name then date
    const sortedResults = [...results].sort((a, b) =>
        a.name.localeCompare(b.name) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedResults.forEach((result) => {
        const taskLabel = examType === 'PRACTICAL'
            ? result.taskTitle || 'Unknown Task'
            : result.caseTitle || result.diagnosis || result.procedure || 'Clinical Entry';

        data.push([
            sn++,
            result.indexNo,
            result.name,
            result.program,
            taskLabel,
            result.score,
            result.status || (result.score >= 67 ? 'PASS' : 'FAIL'),
            result.examinerName,
            formatDate(result.createdAt)
        ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merge title cells
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // Merge title across 9 cols
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }); // Merge date across 9 cols
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }); // Merge pass mark across 9 cols

    // Set column widths
    ws['!cols'] = [
        { wch: 6 },  // S/N
        { wch: 15 }, // Index No
        { wch: 30 }, // Name
        { wch: 25 }, // Program
        { wch: 35 }, // Task
        { wch: 10 }, // Score
        { wch: 8 },  // Status
        { wch: 30 }, // Examiner(s)
        { wch: 15 }  // Date
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

export const generatePDF = (results: ExportResult[], examType: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
            const chunks: any[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Document Configuration
            const startX = 30;
            const tableTop = 110;
            const baseRowHeight = 25;
            // 9 columns: S/N, Index, Name, Program, Task, Score, Status, Examiner(s), Date
            // Total ~780 for landscape A4
            const colWidths = [30, 75, 120, 100, 145, 45, 45, 155, 65];
            const tableWidth = colWidths.reduce((a, b) => a + b, 0);

            // Helper to draw horizontal line
            const drawLine = (y: number) => {
                doc.lineWidth(0.5).moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
            };

            // Helper to draw vertical lines
            const drawVerticalLines = (y: number, height: number) => {
                let x = startX;
                doc.lineWidth(0.5);
                [0, ...colWidths].forEach((_w, i) => {
                    x += (i === 0 ? 0 : colWidths[i - 1]);
                    doc.moveTo(x, y).lineTo(x, y + height).stroke();
                });
            };

            // Draw Header Function
            const drawHeader = (y: number) => {
                // Background
                doc.rect(startX, y, tableWidth, baseRowHeight).fill('#f0f0f0');
                doc.fillColor('#000000');

                // Borders
                drawLine(y);
                drawLine(y + baseRowHeight);
                drawVerticalLines(y, baseRowHeight);

                // Text
                let cx = startX + 4;
                const headers = ['S/N', 'Index No', 'Student Name', 'Program', 'Task/Procedure', 'Score', 'Status', 'Examiner(s)', 'Date'];

                doc.font('Helvetica-Bold').fontSize(8);
                headers.forEach((h, i) => {
                    doc.text(h, cx, y + 8, { width: colWidths[i] - 8, align: 'left' });
                    cx += colWidths[i];
                });
            };

            // Initial Title
            doc.fontSize(16).text('NMC ASSESSMENT RESULTS', { align: 'center' });

            const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            doc.fontSize(10).text(`Generated on: ${dateStr}`, { align: 'center' });

            doc.fontSize(9).text('Pass Mark: 67%', { align: 'center' });
            doc.moveDown();

            let y = tableTop;
            drawHeader(y);
            y += baseRowHeight;

            let sn = 1;
            doc.font('Helvetica').fontSize(8);

            // Sort results
            const sortedResults = [...results].sort((a, b) =>
                a.name.localeCompare(b.name) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            sortedResults.forEach((result) => {
                const taskLabel = examType === 'PRACTICAL'
                    ? result.taskTitle || 'Unknown'
                    : result.caseTitle || result.diagnosis || result.procedure || 'Entry';

                const status = result.status || (result.score >= 67 ? 'PASS' : 'FAIL');

                const rowData = [
                    sn.toString(),
                    result.indexNo,
                    result.name,
                    result.program,
                    taskLabel,
                    `${result.score}%`,
                    status,
                    result.examinerName,
                    formatDate(result.createdAt)
                ];

                // Calculate dynamic height based on text wrapping
                let maxCellHeight = baseRowHeight;
                rowData.forEach((text, i) => {
                    const textHeight = doc.heightOfString(text, { width: colWidths[i] - 8 });
                    if (textHeight + 16 > maxCellHeight) {
                        maxCellHeight = textHeight + 16;
                    }
                });

                // Check for new page
                if (y + maxCellHeight > doc.page.height - 50) {
                    doc.addPage();
                    y = 50;
                    drawHeader(y);
                    y += baseRowHeight;
                    doc.font('Helvetica').fontSize(8);
                }

                // Draw Cell Data with status coloring
                let cx = startX + 4;
                rowData.forEach((text, i) => {
                    // Color the Status cell
                    if (i === 6) {
                        doc.fillColor(text === 'PASS' ? '#15803d' : '#dc2626');
                        doc.font('Helvetica-Bold');
                    }
                    doc.text(text, cx, y + 8, { width: colWidths[i] - 8, align: 'left' });
                    if (i === 6) {
                        doc.fillColor('#000000');
                        doc.font('Helvetica');
                    }
                    cx += colWidths[i];
                });

                // Draw row borders
                drawLine(y + maxCellHeight);
                drawVerticalLines(y, maxCellHeight);

                y += maxCellHeight;
                sn++;
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
