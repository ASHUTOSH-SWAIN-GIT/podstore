// app/api/workers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { workerManager } from "@/lib/utils/worker-manager";

export async function GET(req: NextRequest) {
  try {
    // Get the status of all workers
    const status = workerManager.getWorkersStatus();
    
    return NextResponse.json({
      success: true,
      workers: status,
      message: "Worker status retrieved successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("[WORKERS-API] Error getting worker status:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to get worker status"
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workerName } = body;
    
    if (!action) {
      return NextResponse.json({
        success: false,
        error: "Action is required (start, stop, restart, ensure-running)"
      }, { status: 400 });
    }
    
    let result: boolean;
    let message: string;
    
    switch (action) {
      case 'start':
        if (workerName) {
          result = await workerManager.startWorker(workerName);
          message = result ? `Worker ${workerName} started successfully` : `Failed to start worker ${workerName}`;
        } else {
          result = await workerManager.startAllWorkers();
          message = result ? "All workers started successfully" : "Some workers failed to start";
        }
        break;
        
      case 'stop':
        if (workerName) {
          result = await workerManager.stopWorker(workerName);
          message = result ? `Worker ${workerName} stopped successfully` : `Failed to stop worker ${workerName}`;
        } else {
          await workerManager.stopAllWorkers();
          result = true;
          message = "All workers stopped successfully";
        }
        break;
        
      case 'restart':
        if (workerName) {
          await workerManager.stopWorker(workerName);
          result = await workerManager.startWorker(workerName);
          message = result ? `Worker ${workerName} restarted successfully` : `Failed to restart worker ${workerName}`;
        } else {
          await workerManager.stopAllWorkers();
          result = await workerManager.startAllWorkers();
          message = result ? "All workers restarted successfully" : "Some workers failed to restart";
        }
        break;
        
      case 'ensure-running':
        result = await workerManager.ensureWorkersRunning();
        message = result ? "All workers are running" : "Some workers failed to start";
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action. Valid actions: start, stop, restart, ensure-running"
        }, { status: 400 });
    }
    
    const status = workerManager.getWorkersStatus();
    
    return NextResponse.json({
      success: result,
      message,
      workers: status
    }, { status: result ? 200 : 500 });
    
  } catch (error) {
    console.error("[WORKERS-API] Error managing workers:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to manage workers"
    }, { status: 500 });
  }
}
