import { Queue } from "bullmq";

// The testRedisConnection function can be shared or remain in one file
async function testRedisConnection(): Promise<boolean> {
  try {
    const testQueue = new Queue('connection-test', {
      connection: {
        url: process.env.REDIS_URL!,
      },
    });
    
    const testPromise = testQueue.add('test', {}, { removeOnComplete: true });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    await Promise.race([testPromise, timeoutPromise]);
    await testQueue.close();
    return true;
  } catch (error) {
    console.error('[REDIS-CONNECTION] Connection test failed:', error);
    return false;
  }
}

export const uploadQueue = new Queue('upload-file', {
    connection: {
        url: process.env.REDIS_URL!,
        // OPTIMIZED: Redis performance settings with better error handling
        maxRetriesPerRequest: 2,
        retryDelayOnFailover: 200,
        commandTimeout: 8000,
        lazyConnect: false,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 8000,
        enableReadyCheck: true,
    },
    // Performance optimizations for I/O-bound upload jobs
    defaultJobOptions: {
        removeOnComplete: 5, // Keep last 5 completed jobs
        removeOnFail: 3,     // Keep last 3 failed jobs
        attempts: 2,         // Retry up to 2 times on network or other errors
        backoff: {
            type: 'fixed',
            delay: 500,      // Retry quickly after a failure
        },
    }
});

// Export connection test function for health checks
export { testRedisConnection };