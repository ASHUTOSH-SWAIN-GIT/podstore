#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting podcast workers...');

// Function to start a worker with proper error handling
function startWorker(name: string, scriptPath: string) {
  console.log(`Starting ${name}...`);
  
  const worker = spawn('npx', ['tsx', scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  worker.on('error', (err: Error) => {
    console.error(` ${name} failed to start:`, err.message);
  });

  worker.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(` ${name} exited with code ${code}, signal ${signal}`);
      console.log(` Restarting ${name} in 5 seconds...`);
      setTimeout(() => startWorker(name, scriptPath), 5000);
    }
  });

  return worker;
}

// Start only the workers we need (no upload worker)
const workers = [
  { name: 'Stitching Worker', script: path.join(__dirname, 'workers/stitchWorker.ts') },
  { name: 'Media Conversion Worker', script: path.join(__dirname, 'workers/mediaWorker.ts') }
];

const workerProcesses = workers.map(({ name, script }) => startWorker(name, script));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down all workers...');
  workerProcesses.forEach(worker => {
    worker.kill('SIGTERM');
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n Received SIGTERM, shutting down workers...');
  workerProcesses.forEach(worker => {
    worker.kill('SIGTERM');
  });
  process.exit(0);
});

console.log(' Workers started! Press Ctrl+C to stop all workers.');
console.log(' Active workers:', workers.map(w => w.name).join(', ')); 