import { Queue } from "bullmq";

// Test Redis connection with timeout
async function testRedisConnection(): Promise<boolean> {
  try {
    const testQueue = new Queue('connection-test', {
      connection: {
        url: process.env.REDIS_URL!,
      },
    });
    
    // Quick connection test with timeout
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

export const conversionQueue = new Queue('media-processing', {
    connection: {
        url: process.env.REDIS_URL!,
        // OPTIMIZED: Redis performance settings with better error handling
        maxRetriesPerRequest: 2, // Increase retries slightly for better reliability
        retryDelayOnFailover: 200, // Slightly longer for more stability
        commandTimeout: 8000, // Increased to 8 seconds to match our API timeout buffer
        lazyConnect: false, // Connect immediately
        keepAlive: 30000, // Keep connection alive
        family: 4, // IPv4 only for faster resolution
        connectTimeout: 8000, // Increased connection timeout
        enableReadyCheck: true, // Ensure connection is ready before operations
    },
    // Performance optimizations
    defaultJobOptions: {
        removeOnComplete: true, // Keep fewer completed jobs for better performance
        removeOnFail: true,     // Keep fewer failed jobs
        attempts: 2,         // Reduce retry attempts for faster processing
        backoff: {
            type: 'fixed',   // Fixed delay is faster than exponential
            delay: 500,      // Shorter delay for faster retries
        },
    }
});

// Export connection test function for health checks
export { testRedisConnection };