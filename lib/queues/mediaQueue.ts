import { Queue } from "bullmq";

export const mediaQueue = new Queue('media-processing', {
    connection: {
        url: process.env.REDIS_URL!,
    },
    // Performance optimizations
    defaultJobOptions: {
        removeOnComplete: 10, // Keep only last 10 completed jobs
        removeOnFail: 5,      // Keep only last 5 failed jobs
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    }
})