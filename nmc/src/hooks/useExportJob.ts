import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export const useExportJob = (type: string) => {
    const { success, error: toastError } = useToast();

    const pollJobStatus = async (jobId: string, fileExtension: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/export/results/status/${jobId}`);
                const data = response.data;

                if (data.status === 'completed') {
                    clearInterval(interval);
                    success(`Export completed. Downloading ${fileExtension} file...`);

                    // Trigger the actual file download via blob
                    const downloadRes = await api.get(`/export/results/download/${jobId}`, {
                        responseType: 'blob'
                    });

                    const blob = new Blob([downloadRes.data]);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `results-${type}-${Date.now()}.${fileExtension}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    toastError(`Export failed: ${data.error || 'Unknown error'}`);
                }
            } catch (err: any) {
                clearInterval(interval);
                console.error('Polling error:', err);
                toastError('Failed to poll background export job.');
            }
        }, 3000);
    };

    const handleExportExcel = async () => {
        try {
            success('Export job queued in background. Please wait...');
            const response = await api.get(`/export/results/excel`, { params: { type } });
            const data = response.data;

            if (data.jobId) {
                pollJobStatus(data.jobId, 'xlsx');
            }
        } catch (error: any) {
            console.error('Export error:', error);
            toastError(error.message || 'Failed to queue Excel file export');
        }
    };

    const handleExportPDF = async () => {
        try {
            success('Export job queued in background. Please wait...');
            const response = await api.get(`/export/results/pdf`, { params: { type } });
            const data = response.data;

            if (data.jobId) {
                pollJobStatus(data.jobId, 'pdf');
            }
        } catch (error: any) {
            console.error('Export error:', error);
            toastError(error.message || 'Failed to queue PDF file export');
        }
    };

    return { handleExportExcel, handleExportPDF };
};
