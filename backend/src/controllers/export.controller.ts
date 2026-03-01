import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { heavyOpsQueue } from '../queues/worker';
import { exportService } from '../services/export.service';

export const exportResultsExcel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const type = req.query.type as string;
        const filters = {
            programId: req.query.programId ? parseInt(req.query.programId as string) : undefined,
            dateFrom: req.query.dateFrom as string | undefined,
            dateTo: req.query.dateTo as string | undefined,
        };

        console.log(`[Export Controller] Generating Sync Excel Export for type: ${type}, filters:`, filters);
        const base64Data = await exportService.generateExcelBuffer(type || 'practical', filters);

        res.json({ status: 'completed', fileData: base64Data, extension: 'xlsx' });
    } catch (error) {
        console.error('Export Excel sync error:', error);
        res.status(500).json({ error: 'Failed to generate excel export' });
    }
};

export const exportResultsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const type = req.query.type as string;
        const filters = {
            programId: req.query.programId ? parseInt(req.query.programId as string) : undefined,
            dateFrom: req.query.dateFrom as string | undefined,
            dateTo: req.query.dateTo as string | undefined,
        };

        console.log(`[Export Controller] Generating Sync PDF Export for type: ${type}, filters:`, filters);
        const base64Data = await exportService.generatePdfBuffer(type || 'practical', filters);

        res.json({ status: 'completed', fileData: base64Data, extension: 'pdf' });
    } catch (error) {
        console.error('Export PDF sync error:', error);
        res.status(500).json({ error: 'Failed to generate pdf export' });
    }
};

export const getExportStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const jobId = req.params.jobId as string;
        const job = await heavyOpsQueue.getJob(jobId);

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const isCompleted = await job.isCompleted();
        const isFailed = await job.isFailed();

        if (isCompleted) {
            res.json({ status: 'completed', fileData: job.returnvalue });
        } else if (isFailed) {
            res.json({ status: 'failed', error: job.failedReason });
        } else {
            res.json({ status: 'processing' });
        }
    } catch (error) {
        console.error('Check export status error:', error);
        res.status(500).json({ error: 'Failed to check export status' });
    }
};

export const downloadExport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const jobId = req.params.jobId as string;
        const job = await heavyOpsQueue.getJob(jobId);

        if (!job || !await job.isCompleted()) {
            res.status(404).json({ error: 'Job not found or not completed' });
            return;
        }

        const bufferData = job.returnvalue?.data || job.returnvalue;
        const buffer = Buffer.isBuffer(bufferData) ? bufferData : Buffer.from(bufferData);

        const isExcel = job.name === 'exportExcel';
        res.setHeader('Content-Type', isExcel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="export-${jobId}.${isExcel ? 'xlsx' : 'pdf'}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Download export error:', error);
        res.status(500).json({ error: 'Failed to download export' });
    }
};
