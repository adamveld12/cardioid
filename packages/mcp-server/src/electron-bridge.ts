import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { EventEmitter } from "events";

interface Command {
  command: string;
  args?: any;
  requestId: string;
}

interface Response {
  requestId: string;
  payload?: any;
  error?: any;
}

interface StatusMessage {
  type: "status";
  status: "ready" | "error" | string; // Allow other statuses
  message?: string;
  details?: any;
}

export class ElectronBridge extends EventEmitter {
  private static instance: ElectronBridge;
  private childProcess: ChildProcess | null = null;
  private isReady = false; // Added isReady flag
  private readyPromise: Promise<void>; // Added readyPromise
  private resolveReadyPromise!: () => void; // Added resolveReadyPromise
  private requestMap: Map<
    string,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  > = new Map();
  private nextRequestId = 0;

  private constructor() {
    super();
    this.readyPromise = new Promise((resolve) => {
      this.resolveReadyPromise = resolve;
    });
    this.spawnAudioEngine();
  }

  public static getInstance(): ElectronBridge {
    if (!ElectronBridge.instance) {
      ElectronBridge.instance = new ElectronBridge();
    }
    return ElectronBridge.instance;
  }

  private spawnAudioEngine() {
    const audioEnginePath = path.resolve(__dirname, "../../../audio-engine"); // Adjust path as necessary

    // Ensure the main field in audio-engine's package.json points to the correct entry file (e.g., dist/main.js)
    // and its "start" script correctly launches Electron.
    // We now use pnpm to run the start script from the audio-engine package.
    this.childProcess = spawn("pnpm", ["run", "start"], {
      // Changed to spawn pnpm run start
      cwd: audioEnginePath,
      stdio: ["pipe", "pipe", "pipe", "ipc"], // Enable IPC
    });

    this.childProcess.stdout?.on("data", (data) => {
      console.log(`[audio-engine|stdout]: ${data.toString().trim()}`);
      this.emit("log", `[audio-engine|stdout]: ${data.toString().trim()}`);
    });

    this.childProcess.stderr?.on("data", (data) => {
      console.error(`[audio-engine|stderr]: ${data.toString().trim()}`);
      this.emit("error", `[audio-engine|stderr]: ${data.toString().trim()}`);
      // If not ready and stderr has data, it might be an early error
      if (!this.isReady) {
        this.emit(
          "ready-error",
          new Error(`Audio engine failed to start: ${data.toString().trim()}`)
        );
      }
    });

    this.childProcess.on("message", (message: Response | StatusMessage) => {
      console.log(
        `[mcp-server|ipc] Received message from audio-engine:`,
        message
      );

      // Check if it's a status message (like 'ready')
      if ("type" in message && message.type === "status") {
        if (message.status === "ready") {
          this.isReady = true;
          this.resolveReadyPromise(); // Resolve the ready promise
          this.emit("ready");
          console.log(
            "[mcp-server|ElectronBridge] Audio-engine reported ready."
          );
        }
        // Potentially handle other status messages here
        return;
      }

      // Handle as a command response
      const { requestId, payload, error } = message as Response;
      const promiseControls = this.requestMap.get(requestId);

      if (promiseControls) {
        if (error) {
          promiseControls.reject(error);
        } else {
          promiseControls.resolve(payload);
        }
        this.requestMap.delete(requestId);
      } else {
        console.warn(
          `[mcp-server|ipc] Received message for unknown requestId: ${requestId}`
        );
      }
    });

    this.childProcess.on("close", (code, signal) => {
      console.log(
        `[audio-engine] child process closed with code ${code} and signal ${signal}`
      );
      this.emit("close", code, signal);
      this.childProcess = null;
      // Optional: Implement retry logic or notify about the closure
    });

    this.childProcess.on("error", (err) => {
      console.error(`[audio-engine] Failed to start child process:`, err);
      this.emit(
        "error",
        `[audio-engine] Failed to start child process: ${err.message}`
      );
      this.childProcess = null;
      this.isReady = false; // Reset ready state
      // Reject readyPromise if it hasn't resolved yet
      this.emit("ready-error", err);
    });

    console.log("[mcp-server|ElectronBridge] Audio-engine process spawned.");
  }

  // Add a method to wait for the bridge to be ready
  public async whenReady(): Promise<void> {
    if (this.isReady) {
      return Promise.resolve();
    }
    return this.readyPromise;
  }

  private generateRequestId(): string {
    return `req-${this.nextRequestId++}`;
  }

  public async sendCommand<T = any>(command: string, args?: any): Promise<T> {
    if (!this.isReady) {
      // Check isReady instead of just childProcess
      throw new Error("Audio-engine is not ready.");
    }
    if (!this.childProcess || !this.childProcess.send) {
      throw new Error(
        "Audio-engine process is not running or IPC not available."
      );
    }

    const requestId = this.generateRequestId();
    const message: Command = { command, args, requestId };

    return new Promise((resolve, reject) => {
      this.requestMap.set(requestId, { resolve, reject });

      this.childProcess!.send!(message, (error) => {
        if (error) {
          this.requestMap.delete(requestId);
          reject(error);
        }
      });
      console.log(`[mcp-server|ipc] Sent command to audio-engine:`, message);
    });
  }

  public async startRecording(options?: any): Promise<any> {
    return this.sendCommand("start-recording", options);
  }

  public async stopRecording(options?: any): Promise<any> {
    return this.sendCommand("stop-recording", options);
  }

  public async getAudioDevices(): Promise<any> {
    return this.sendCommand("get-audio-devices");
  }

  public dispose(): void {
    if (this.childProcess) {
      console.log(
        "[mcp-server|ElectronBridge] Disposing ElectronBridge, killing audio-engine process."
      );
      this.childProcess.kill();
      this.childProcess = null;
    }
    this.isReady = false; // Reset ready state
    // Re-create readyPromise for potential re-initialization (if getInstance is called again)
    this.readyPromise = new Promise((resolve) => {
      this.resolveReadyPromise = resolve;
    });
    this.requestMap.clear();
    ElectronBridge.instance = null as any; // Allow re-creation for testing or specific scenarios
  }
}
