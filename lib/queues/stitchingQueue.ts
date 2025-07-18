// lib/queues/stitchingQueue.ts

import { Queue } from "bullmq";
import "dotenv/config";

// Ensure your Redis URL is available in the environment
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in the environment variables");
}

// Create a new queue instance specifically for stitching jobs.
// The name "stitching-processing" MUST match the name used in your new worker.
export const stitchingQueue = new Queue("stitching-processing", {
  connection: {
    url: process.env.REDIS_URL,
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed stitching jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Wait 5 seconds before the first retry
    },
  },
});

console.log("✅ Stitching queue initialized.");
