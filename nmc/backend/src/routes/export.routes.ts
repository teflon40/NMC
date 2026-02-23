import { Router } from 'express';
import { exportResultsExcel, exportResultsPDF, getExportStatus, downloadExport } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/results/excel', exportResultsExcel);
router.get('/results/excel', exportResultsExcel);
router.get('/results/pdf', exportResultsPDF);
router.get('/results/status/:jobId', getExportStatus);
router.get('/results/download/:jobId', downloadExport);

export default router;
