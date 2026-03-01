import { useToast } from '../context/ToastContext';
import api from '../lib/api';

interface ExportFilters {
    programId?: string | number;
    dateFrom?: string;
    dateTo?: string;
}

export const useExportJob = (
    type: string,
    baseFileName: string = `results-${type}`,
    filters: ExportFilters = {}
) => {
    const { success, error: toastError } = useToast();

    const processSyncDownload = (data: any, fileExtension: string) => {
        if (data.status === 'completed' && data.fileData) {
            success(`Export completed. Downloading ${fileExtension} file...`);

            // Convert base64 to Blob
            const byteCharacters = atob(data.fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const mimeType = fileExtension === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';

            const blob = new Blob([byteArray], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseFileName}.${fileExtension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            toastError('Export failed: Unexpected response from server');
        }
    };

    // Build params including any active filters
    const buildParams = () => ({
        type,
        ...(filters.programId ? { programId: filters.programId } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    });

    const handleExportExcel = async () => {
        try {
            success('Generating Excel file. Please wait...');
            const response = await api.get(`/export/results/excel`, { params: buildParams(), timeout: 0 });
            processSyncDownload(response.data, 'xlsx');
        } catch (error: any) {
            console.error('Export error:', error);
            toastError(error.message || 'Failed to generate Excel file');
        }
    };

    const handleExportPDF = async () => {
        try {
            success('Generating PDF file. Please wait...');
            const response = await api.get(`/export/results/pdf`, { params: buildParams(), timeout: 0 });
            processSyncDownload(response.data, 'pdf');
        } catch (error: any) {
            console.error('Export error:', error);
            toastError(error.message || 'Failed to generate PDF file');
        }
    };

    return { handleExportExcel, handleExportPDF };
};
