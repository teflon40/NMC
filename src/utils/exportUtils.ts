import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export to Excel
export const exportToExcel = (data: any[], fileName: string) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : ['No Data'];
    const numCols = columns.length;
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    // Build as a true array-of-arrays so each row is exactly one row
    const aoa: any[][] = [
        ['Nursing And Midwifery Training College, Teshie', ...Array(numCols - 1).fill('')], // Row 1
        [`Generated on: ${dateStr}`, ...Array(numCols - 1).fill('')],                       // Row 2
        Array(numCols).fill(''),                                                              // Row 3 (spacer)
        columns,                                                                              // Row 4 (headers)
        ...data.map(row => columns.map(col => row[col] ?? '')),                              // Data rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge title and date rows across all columns
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } });

    // Set reasonable column widths
    ws['!cols'] = columns.map(col => ({ wch: Math.max(String(col).length + 4, 15) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `${fileName}.xlsx`);
};

// Export to PDF
export const exportToPDF = (columns: string[], data: any[], title: string, fileName?: string) => {
    const doc = new jsPDF();

    // Add title and headers
    doc.setFontSize(16);
    doc.text('Nursing And Midwifery Training College, Teshie', 14, 20);
    doc.setFontSize(14);
    doc.text(title, 14, 28);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`, 14, 34);

    const tableData = data.map(row => Object.values(row));

    autoTable(doc, {
        head: [columns],
        body: tableData,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 133, 244] }, // Blue header
    });

    doc.save(`${fileName || title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Copy to Clipboard
export const copyToClipboard = (data: any[]) => {
    // Basic CSV-like copy
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join('\t'),
        ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(csvContent)
        .then(() => alert('Table data copied to clipboard!')) // Or use a toast if passed
        .catch(err => console.error('Failed to copy: ', err));
};

// Print Table
export const printTable = (title: string, columns: string[], data: any[]) => {
    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHeaders = columns.map(c => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">${c}</th>`).join('');

    const tableRows = data.map(row => {
        const cells = Object.values(row).map(val => `<td style="border: 1px solid #ddd; padding: 8px;">${val}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                h1 { text-align: center; color: #333; }
                .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>${tableHeaders}</tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="footer">NMC Assessment Portal System</div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
};

// Download Template (generic)
export const downloadTemplate = (columns: string[], fileName: string) => {
    // Create an empty object with keys as columns
    const emptyRow = columns.reduce((acc, curr) => ({ ...acc, [curr]: '' }), {});
    exportToExcel([emptyRow], fileName);
};

// Download Candidates Import Template  (rich version with sample rows + instructions tab)
export const downloadCandidatesTemplate = (programNames: string[], fileName: string = 'Candidates_Import_Template') => {
    const workbook = XLSX.utils.book_new();

    // ── Sheet 1: Import Data ──────────────────────────────────────────────────
    // One example row per program so all programs are visible immediately
    const sampleRows = programNames.length > 0
        ? programNames.map((prog, i) => ({
            'Index No.': `NMC/2024/${String(i + 1).padStart(3, '0')}`,
            'Lastname': '',
            'Othernames': '',
            'Program': prog,
        }))
        : [
            { 'Index No.': 'NMC/2024/001', 'Lastname': '', 'Othernames': '', 'Program': '<paste program name here>' },
        ];

    const dataSheet = XLSX.utils.json_to_sheet(sampleRows, {
        header: ['Index No.', 'Lastname', 'Othernames', 'Program']
    });

    // Column widths
    dataSheet['!cols'] = [
        { wch: 18 },  // Index No.
        { wch: 20 },  // Lastname
        { wch: 25 },  // Othernames
        { wch: 30 },  // Program
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Candidates');

    // ── Sheet 2: Instructions ────────────────────────────────────────────────
    const instructions: (string[])[] = [
        ['CANDIDATE IMPORT — INSTRUCTIONS'],
        [''],
        ['Column', 'Required?', 'Description'],
        ['Index No.', 'YES', 'Unique candidate index number (e.g. NMC/2024/001)'],
        ['Lastname', 'YES', 'Candidate surname / family name'],
        ['Othernames', 'NO', 'First and middle names'],
        ['Program', 'YES', 'Must exactly match one of the program names below'],
        [''],
        ['AVAILABLE PROGRAMS (copy exactly as shown):'],
        ...programNames.map(p => [p]),
        [''],
        ['NOTES:'],
        ['• Do NOT change the column header names.'],
        ['• Rows with duplicate Index Numbers will be skipped automatically.'],
        ['• Rows with unrecognised Program names will show as errors in the preview.'],
        ['• Remove the 3 sample rows before uploading your real data.'],
    ];

    const instrSheet = XLSX.utils.aoa_to_sheet(instructions);
    instrSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 60 }];

    XLSX.utils.book_append_sheet(workbook, instrSheet, 'Instructions');

    // ── Export ───────────────────────────────────────────────────────────────
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

