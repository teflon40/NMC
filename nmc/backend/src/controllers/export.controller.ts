import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { heavyOpsQueue } from '../queues/worker';

export const exportResultsExcel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const type = req.query.type as string;

        console.log(`[Export Controller] Enqueueing Excel Export for type: ${type}`);
        const job = await heavyOpsQueue.add('exportExcel', { type: type || 'practical' });

        res.status(202).json({ jobId: job.id, message: 'Export job queued successfully.' });
    } catch (error) {
        console.error('Export Excel queue error:', error);
        res.status(500).json({ error: 'Failed to queue excel export' });
    }
};

export const exportResultsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type } = req.query;

        console.log(`[Export Controller] Enqueueing PDF Export for type: ${type}`);
        const job = await heavyOpsQueue.add('exportPdf', { type: type || 'practical' });

        res.status(202).json({ jobId: job.id, message: 'Export job queued successfully.' });
    } catch (error) {
        console.error('Export PDF queue error:', error);
        res.status(500).json({ error: 'Failed to queue pdf export' });
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
