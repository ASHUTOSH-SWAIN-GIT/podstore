// test-worker-manager.js
// Simple test script to verify worker management functionality

const { workerManager } = require('./lib/utils/worker-manager.ts');

async function testWorkerManager() {
  console.log('🧪 Testing Worker Manager...\n');

  try {
    // Test 1: Get initial status
    console.log('1. Getting initial worker status...');
    const initialStatus = workerManager.getWorkersStatus();
    console.log('Initial status:', initialStatus);
    console.log('');

    // Test 2: Ensure workers are running
    console.log('2. Ensuring workers are running...');
    const ensureResult = await workerManager.ensureWorkersRunning();
    console.log('Ensure workers result:', ensureResult);
    console.log('');

    // Test 3: Get status after starting
    console.log('3. Getting status after starting...');
    const runningStatus = workerManager.getWorkersStatus();
    console.log('Running status:', runningStatus);
    console.log('');

    // Test 4: Check individual worker status
    console.log('4. Checking individual worker status...');
    console.log('Stitching worker running:', workerManager.isWorkerRunning('stitching-worker'));
    console.log('Media worker running:', workerManager.isWorkerRunning('media-worker'));
    console.log('');

    // Wait a bit to let workers initialize
    console.log('5. Waiting 10 seconds for workers to initialize...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 5: Final status check
    console.log('6. Final status check...');
    const finalStatus = workerManager.getWorkersStatus();
    console.log('Final status:', finalStatus);
    console.log('');

    console.log('✅ Worker manager test completed successfully!');
    console.log('💡 Workers now start automatically when sessions end.');
    console.log('💡 Upload chunks and end a session to trigger processing.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // Don't stop workers automatically in test - let them run
  console.log('\n🔄 Workers are now running. Use Ctrl+C to stop them.');
}

// Run the test
testWorkerManager().catch(console.error);
