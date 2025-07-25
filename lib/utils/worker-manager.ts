// lib/utils/worker-manager.ts

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface WorkerProcess {
  name: string;
  process: ChildProcess | null;
  scriptPath: string;
  isRunning: boolean;
}

class WorkerManager {
  private workers: Map<string, WorkerProcess> = new Map();
  private autoRestart: boolean = true;

  constructor() {
    // Initialize worker definitions
    const workerDefinitions = [
      { 
        name: 'stitching-worker', 
        scriptPath: path.join(process.cwd(), 'workers/stitchWorker.ts') 
      },
      { 
        name: 'media-worker', 
        scriptPath: path.join(process.cwd(), 'workers/mediaWorker.ts') 
      }
    ];

    // Setup worker process objects
    workerDefinitions.forEach(({ name, scriptPath }) => {
      this.workers.set(name, {
        name,
        process: null,
        scriptPath,
        isRunning: false
      });
    });
  }

  /**
   * Start a specific worker by name
   */
  startWorker(workerName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const worker = this.workers.get(workerName);
      
      if (!worker) {
        console.error(`[WORKER-MANAGER] Worker ${workerName} not found`);
        return reject(new Error(`Worker ${workerName} not found`));
      }

      if (worker.isRunning && worker.process) {
        console.log(`[WORKER-MANAGER] Worker ${workerName} is already running`);
        return resolve(true);
      }

      console.log(`[WORKER-MANAGER] Starting ${workerName}...`);
      
      const workerProcess = spawn('npx', ['tsx', worker.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'], // Capture stdio for logging
        env: { ...process.env, FORCE_COLOR: '1' },
        detached: false // Keep as child process
      });

      // Handle worker output
      workerProcess.stdout?.on('data', (data) => {
        console.log(`[${workerName.toUpperCase()}] ${data.toString().trim()}`);
      });

      workerProcess.stderr?.on('data', (data) => {
        console.error(`[${workerName.toUpperCase()}] ${data.toString().trim()}`);
      });

      workerProcess.on('error', (err) => {
        console.error(`[WORKER-MANAGER] ${workerName} failed to start:`, err.message);
        worker.isRunning = false;
        worker.process = null;
        reject(err);
      });

      workerProcess.on('exit', (code, signal) => {
        console.log(`[WORKER-MANAGER] ${workerName} exited with code ${code}, signal ${signal}`);
        worker.isRunning = false;
        worker.process = null;

        if (code !== 0 && this.autoRestart) {
          console.log(`[WORKER-MANAGER] Restarting ${workerName} in 5 seconds...`);
          setTimeout(() => {
            this.startWorker(workerName).catch(err => {
              console.error(`[WORKER-MANAGER] Failed to restart ${workerName}:`, err.message);
            });
          }, 5000);
        }
      });

      // Give the process a moment to start before checking if it's running
      setTimeout(() => {
        if (workerProcess.pid) {
          worker.process = workerProcess;
          worker.isRunning = true;
          console.log(`[WORKER-MANAGER] ${workerName} started successfully with PID ${workerProcess.pid}`);
          resolve(true);
        } else {
          reject(new Error(`Failed to start ${workerName}`));
        }
      }, 1000);
    });
  }

  /**
   * Start all workers
   */
  async startAllWorkers(): Promise<boolean> {
    console.log(`[WORKER-MANAGER] Starting all workers...`);
    
    const startPromises = Array.from(this.workers.keys()).map(workerName => 
      this.startWorker(workerName).catch(err => {
        console.error(`[WORKER-MANAGER] Failed to start ${workerName}:`, err.message);
        return false;
      })
    );

    const results = await Promise.all(startPromises);
    const allStarted = results.every(result => result === true);
    
    if (allStarted) {
      console.log(`[WORKER-MANAGER] ✅ All workers started successfully`);
    } else {
      console.log(`[WORKER-MANAGER] ⚠️ Some workers failed to start`);
    }
    
    return allStarted;
  }

  /**
   * Stop a specific worker by name
   */
  stopWorker(workerName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const worker = this.workers.get(workerName);
      
      if (!worker || !worker.process || !worker.isRunning) {
        console.log(`[WORKER-MANAGER] Worker ${workerName} is not running`);
        return resolve(true);
      }

      console.log(`[WORKER-MANAGER] Stopping ${workerName}...`);
      
      worker.process.on('exit', () => {
        console.log(`[WORKER-MANAGER] ${workerName} stopped`);
        worker.isRunning = false;
        worker.process = null;
        resolve(true);
      });

      // Try graceful shutdown first
      worker.process.kill('SIGTERM');
      
      // Force kill after 10 seconds if still running
      setTimeout(() => {
        if (worker.process && worker.isRunning) {
          console.log(`[WORKER-MANAGER] Force killing ${workerName}...`);
          worker.process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  /**
   * Stop all workers
   */
  async stopAllWorkers(): Promise<void> {
    console.log(`[WORKER-MANAGER] Stopping all workers...`);
    this.autoRestart = false; // Disable auto-restart during shutdown
    
    const stopPromises = Array.from(this.workers.keys()).map(workerName => 
      this.stopWorker(workerName)
    );

    await Promise.all(stopPromises);
    console.log(`[WORKER-MANAGER] All workers stopped`);
  }

  /**
   * Check if a specific worker is running
   */
  isWorkerRunning(workerName: string): boolean {
    const worker = this.workers.get(workerName);
    return worker ? worker.isRunning : false;
  }

  /**
   * Get status of all workers
   */
  getWorkersStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.workers.forEach((worker, name) => {
      status[name] = worker.isRunning;
    });
    return status;
  }

  /**
   * Ensure workers are running (start them if they're not)
   */
  async ensureWorkersRunning(): Promise<boolean> {
    const status = this.getWorkersStatus();
    const stoppedWorkers = Object.entries(status)
      .filter(([_, isRunning]) => !isRunning)
      .map(([name, _]) => name);

    if (stoppedWorkers.length === 0) {
      console.log(`[WORKER-MANAGER] All workers are already running`);
      return true;
    }

    console.log(`[WORKER-MANAGER] Starting stopped workers: ${stoppedWorkers.join(', ')}`);
    
    const startPromises = stoppedWorkers.map(workerName => 
      this.startWorker(workerName).catch(err => {
        console.error(`[WORKER-MANAGER] Failed to start ${workerName}:`, err.message);
        return false;
      })
    );

    const results = await Promise.all(startPromises);
    return results.every(result => result === true);
  }
}

// Create a singleton instance
export const workerManager = new WorkerManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[WORKER-MANAGER] Received SIGINT, shutting down workers...');
  await workerManager.stopAllWorkers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[WORKER-MANAGER] Received SIGTERM, shutting down workers...');
  await workerManager.stopAllWorkers();
  process.exit(0);
});
