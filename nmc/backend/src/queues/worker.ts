import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../utils/redis';
import { exportService } from '../services/export.service';
import { wipeService } from '../services/wipe.service';

// Define the queues
export const heavyOpsQueue = new Queue('HeavyOperations', {
    connection: redisClient as any // using existing ioredis/redis client
});

// A placeholder for our job handlers
const processJob = async (job: Job) => {
    console.log(`[BullMQ Worker] Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
        case 'exportPdf':
            return await exportService.generatePdfBuffer(job.data.type);

        case 'exportExcel':
            return await exportService.generateExcelBuffer(job.data.type);

        case 'selectiveWipe':
            return await wipeService.executeWipe(job.data.wipeOptions, job.data.currentUserId);


        default:
            throw new Error(`Unknown job name: ${job.name}`);
    }
};

// Initialize the worker
export const initWorker = () => {
    const worker = new Worker('HeavyOperations', processJob, {
        connection: redisClient as any
    });

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed with ${err.message}`);
    });

    return worker;
};
