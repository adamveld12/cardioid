import { app, BrowserWindow, desktopCapturer, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import { EnvironmentConfig } from "../config/environment";

// Recording state types
export enum RecordingStatus {
  IDLE = "IDLE",
  RECORDING = "RECORDING",
  ERROR = "ERROR",
}

export interface RecordingState {
  status: RecordingStatus;
  startTime?: number;
  targetApplication?: string;
  elapsedTimeSeconds?: number;
  errorMessage?: string;
}

/**
 * Recording Engine that manages Electron app and audio capture
 */
export class RecordingEngine {
  private window: BrowserWindow | null = null;
  private recordingState: RecordingState = { status: RecordingStatus.IDLE };
  private recordingTimer: NodeJS.Timeout | null = null;
  private maxRecordingLength: number;

  constructor() {
    this.maxRecordingLength = EnvironmentConfig.getMaxRecordingLength();
  }

  /**
   * Initialize the Electron app and create a hidden window
   */
  public async initialize(): Promise<void> {
    if (this.window) {
      return;
    }

    // Check if app is ready, if not wait for it
    if (!app.isReady()) {
      await new Promise<void>((resolve) => {
        app.on("ready", () => resolve());
      });
    }

    // Create a hidden browser window
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Load the recorder HTML file
    const recorderPath = path.join(
      __dirname,
      "..",
      "..",
      "renderer",
      "recorder.html"
    );
    await this.window.loadFile(recorderPath);

    // Set up IPC listeners for communication with renderer process
    this.setupIpcListeners();

    // Prevent app from closing when all windows are closed
    app.on("window-all-closed", (e: Electron.Event) => {
      e.preventDefault();
    });
  }

  /**
   * Start recording audio
   * @param targetApplication Optional target application name (Zoom, Meet, etc.)
   */
  public async startRecording(
    targetApplication?: string
  ): Promise<RecordingState> {
    if (this.recordingState.status === RecordingStatus.RECORDING) {
      return this.recordingState;
    }

    try {
      await this.initialize();

      // Get available audio sources
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false, // Optimize performance
      });

      let sourceId: string;
      let sourceDescription: string;

      if (targetApplication) {
        // Enhanced application targeting with better matching logic
        const appNameLower = targetApplication.toLowerCase();

        // Try to find exact match first
        let targetSource = sources.find((source) =>
          source.name.toLowerCase() === appNameLower
        );

        // If no exact match, try partial match
        if (!targetSource) {
          targetSource = sources.find((source) =>
            source.name.toLowerCase().includes(appNameLower)
          );
        }

        // Try alternative common names for popular apps
        if (!targetSource) {
          const alternativeNames: { [key: string]: string[] } = {
            'zoom': ['zoom meeting', 'zoom.us', 'zoom'],
            'google meet': ['meet.google.com', 'google meet', 'meet'],
            'slack': ['slack call', 'slack huddle', 'slack'],
            'teams': ['microsoft teams', 'teams meeting', 'teams'],
          };

          const alternatives = alternativeNames[appNameLower] || [];
          for (const altName of alternatives) {
            targetSource = sources.find((source) =>
              source.name.toLowerCase().includes(altName)
            );
            if (targetSource) break;
          }
        }

        if (!targetSource) {
          // List available sources for debugging
          const availableSources = sources.map(s => s.name).join(', ');
          throw new Error(
            `Target application "${targetApplication}" not found. Available sources: ${availableSources}`
          );
        }

        sourceId = targetSource.id;
        sourceDescription = targetSource.name;
      } else {
        // If no target specified, prefer screen capture over individual windows
        const screenSources = sources.filter(source => source.id.startsWith('screen:'));
        const preferredSource = screenSources.length > 0 ? screenSources[0] : sources[0];

        if (!preferredSource) {
          throw new Error("No available audio sources found");
        }

        sourceId = preferredSource.id;
        sourceDescription = preferredSource.name;
      }

      // Send command to renderer process to start recording
      this.window?.webContents.send("start-recording", {
        sourceId,
        sourceDescription
      });

      // Update recording state
      this.recordingState = {
        status: RecordingStatus.RECORDING,
        startTime: Date.now(),
        targetApplication: targetApplication || sourceDescription || "Screen",
        elapsedTimeSeconds: 0,
      };

      // Start a timer to update elapsed time and check for max duration
      this.recordingTimer = setInterval(() => {
        if (this.recordingState.startTime) {
          const elapsedMs = Date.now() - this.recordingState.startTime;
          this.recordingState.elapsedTimeSeconds = Math.floor(elapsedMs / 1000);

          // Auto-stop recording if max length is reached
          if (
            this.recordingState.elapsedTimeSeconds >= this.maxRecordingLength
          ) {
            this.stopRecording().catch((err) => {
              console.error("Error auto-stopping recording:", err);
            });
          }
        }
      }, 1000);

      return this.recordingState;
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.recordingState = {
        status: RecordingStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      return this.recordingState;
    }
  }

  /**
   * Stop recording audio and save to WAV file
   * @param outputDirectory Optional output directory for the WAV file
   */
  public async stopRecording(
    outputDirectory?: string
  ): Promise<{ path: string; meta: any }> {
    if (this.recordingState.status !== RecordingStatus.RECORDING) {
      throw new Error("No active recording to stop");
    }

    try {
      // Clear the recording timer
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      // Determine output directory
      const outputDir =
        outputDirectory || EnvironmentConfig.getOutputDirectory();

      // Make sure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `recording-${timestamp}.wav`;
      const filePath = path.join(outputDir, fileName);

      // Send stop command to renderer process with timeout
      const savePath = await new Promise<string>((resolve, reject) => {
        // Set up timeout for saving operation
        const timeout = setTimeout(() => {
          reject(new Error("Recording save operation timed out"));
        }, 30000); // 30 second timeout

        // Set up one-time listener for save result
        const saveHandler = (_: any, result: any) => {
          clearTimeout(timeout);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.path);
          }
        };

        ipcMain.once("recording-saved", saveHandler);

        // Tell renderer to stop recording and save file
        this.window?.webContents.send("stop-recording", { filePath });
      });

      // Prepare response with metadata
      const meta = {
        elapsedTimeSeconds: this.recordingState.elapsedTimeSeconds,
        application: this.recordingState.targetApplication,
      };

      // Reset recording state
      this.recordingState = { status: RecordingStatus.IDLE };

      return {
        path: savePath,
        meta,
      };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      this.recordingState = {
        status: RecordingStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  public getStatus(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * Clean up resources when shutting down
   */
  public async cleanup(): Promise<void> {
    try {
      // Stop any active recording
      if (this.recordingState.status === RecordingStatus.RECORDING) {
        await this.stopRecording();
      }

      // Clear timer if it exists
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      // Close window if it exists
      if (this.window) {
        this.window.close();
        this.window = null;
      }

      // Quit app if it's running and available
      if (app && app.isReady()) {
        app.quit();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Set up IPC listeners for communication with renderer process
   */
  private setupIpcListeners(): void {
    // Remove any existing listeners to prevent duplicates
    ipcMain.removeAllListeners("recording-error");
    ipcMain.removeAllListeners("recording-started");

    // Listen for recording errors from renderer
    ipcMain.on("recording-error", (_, error) => {
      console.error("Recording error from renderer:", error);
      this.recordingState = {
        status: RecordingStatus.ERROR,
        errorMessage: error,
      };

      // Clear timer if it exists
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    });

    // Listen for successful recording start confirmation
    ipcMain.on("recording-started", () => {
      console.log("Recording successfully started in renderer process");
    });
  }
}

export default RecordingEngine;
