/**
 * Electron Audio Capture Process Main Entry
 *
 * This is the main process for the Electron audio capture application.
 * It runs headlessly (without GUI) and handles IPC messages from the MCP server
 * to detect Zoom meetings and capture system audio.
 */

import { app, desktopCapturer } from 'electron';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  IPCResponse,
  StartRecordingParams,
  StartRecordingResult,
  StopRecordingResult,
  GetStatusResult,
  CheckMeetingResult,
  RecordingState,
  MeetingApplication,
  IPC_ERROR_CODES,
  IPCErrorCode,
  createIPCResponse,
  createIPCErrorResponse,
  isIPCRequest,
} from '../../shared/src/ipc-messages';

const execAsync = promisify(exec);

// ============================================================================
// Application State Management
// ============================================================================

/**
 * Global application state for recording management
 */
class RecordingManager {
  private currentState: RecordingState = {
    status: 'IDLE',
  };

  private recordingProcess: any = null;
  private startTime: Date | null = null;
  private outputPath: string | null = null;

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return { ...this.currentState };
  }

  /**
   * Update recording state
   */
  setState(newState: Partial<RecordingState>) {
    this.currentState = { ...this.currentState, ...newState };
  }

  /**
   * Start recording process
   */
  async startRecording(params: StartRecordingParams): Promise<StartRecordingResult> {
    if (this.currentState.status === 'RECORDING') {
      throw new Error('Recording already in progress');
    }

    // Check for meeting applications
    const meetingCheck = await this.checkMeetingApplications(params.target);
    if (!meetingCheck.meetingDetected) {
      throw new Error('No active meeting found');
    }

    // Prepare output directory and filename
    const outputDir = params.outputDirectory || path.join(os.homedir(), '.cardioid_recordings');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = params.filename || `cardioid-recording-${timestamp}.wav`;
    this.outputPath = path.join(outputDir, filename);

    // Start real audio recording using system tools
    try {
      await this.startSystemAudioCapture(this.outputPath);
    } catch (error) {
      this.setState({ status: 'ERROR', error: `Failed to start audio capture: ${error}` });
      throw new Error(`Failed to start audio capture: ${error}`);
    }

    this.startTime = new Date();
    this.setState({
      status: 'RECORDING',
      application: meetingCheck.detectedApplications[0],
      outputFilePath: this.outputPath,
      startTime: this.startTime.toISOString(),
      elapsedTimeSeconds: 0,
    });

    // Start a timer to track elapsed time
    const timer = setInterval(() => {
      if (this.currentState.status === 'RECORDING' && this.startTime) {
        const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
        this.setState({ elapsedTimeSeconds: elapsed });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return {
      success: true,
      outputFilePath: this.outputPath,
      detectedApplication: meetingCheck.detectedApplications[0],
      startTime: this.startTime.toISOString(),
    };
  }

  /**
   * Stop recording process
   */
  async stopRecording(): Promise<StopRecordingResult> {
    if (this.currentState.status !== 'RECORDING') {
      throw new Error('No recording in progress');
    }

    this.setState({ status: 'STOPPING' });

    // Stop the actual recording process
    if (this.recordingProcess) {
      // Send SIGTERM for graceful shutdown
      this.recordingProcess.kill('SIGTERM');

      // Wait for process to exit, with timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if process doesn't exit gracefully
          if (this.recordingProcess) {
            this.recordingProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.recordingProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.recordingProcess = null;
    }

    const duration = this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0;
    const outputPath = this.outputPath!;

    // Get actual file size
    let fileSizeBytes = 0;
    try {
      const stats = await fs.stat(outputPath);
      fileSizeBytes = stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      // Fallback to estimated size based on duration
      fileSizeBytes = duration * 176400; // Approximate for 44.1kHz 16-bit stereo
    }

    this.setState({
      status: 'IDLE',
      elapsedTimeSeconds: duration,
    });

    this.startTime = null;
    this.outputPath = null;

    return {
      success: true,
      outputFilePath: outputPath,
      durationSeconds: duration,
      fileSizeBytes,
    };
  }

  /**
   * Check for meeting applications
   */
  async checkMeetingApplications(target?: MeetingApplication): Promise<CheckMeetingResult> {
    const detectedApplications: MeetingApplication[] = [];
    const processInfo: any = {};

    try {
      // Check for Zoom processes
      const { stdout: zoomProcesses } = await execAsync('pgrep -f -i zoom || true');
      if (zoomProcesses.trim()) {
        detectedApplications.push('zoom');
        processInfo.zoom = {
          pid: parseInt(zoomProcesses.trim().split('\n')[0]),
          name: 'zoom',
        };
      }

      // Check for Google Meet (Chrome/Chromium processes with meet.google.com)
      const { stdout: chromeProcesses } = await execAsync('pgrep -f -i "chrome.*meet.google.com" || true');
      if (chromeProcesses.trim()) {
        detectedApplications.push('meet');
        processInfo.meet = {
          pid: parseInt(chromeProcesses.trim().split('\n')[0]),
          name: 'chrome',
        };
      }

      // Check for Microsoft Teams
      const { stdout: teamsProcesses } = await execAsync('pgrep -f -i teams || true');
      if (teamsProcesses.trim()) {
        detectedApplications.push('teams');
        processInfo.teams = {
          pid: parseInt(teamsProcesses.trim().split('\n')[0]),
          name: 'teams',
        };
      }

      // If target is specified, check if it's detected
      if (target && !detectedApplications.includes(target)) {
        return {
          meetingDetected: false,
          detectedApplications: [],
          processInfo: {},
        };
      }

    } catch (error) {
      console.error('Error checking meeting applications:', error);
    }

    return {
      meetingDetected: detectedApplications.length > 0,
      detectedApplications,
      processInfo,
    };
  }

  /**
   * Get system status including audio devices
   */
  async getSystemStatus(): Promise<GetStatusResult> {
    // Get audio devices count using desktop capturer
    let audioDevicesCount = 0;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        fetchWindowIcons: false
      });
      audioDevicesCount = sources.length;
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      audioDevicesCount = 2; // Fallback value
    }

    // Check for meeting applications
    const meetingCheck = await this.checkMeetingApplications();

    return {
      state: this.getState(),
      system: {
        audioDevicesCount,
        detectedMeetings: meetingCheck.detectedApplications,
      },
    };
  }

  /**
   * Start system audio capture using available tools
   */
  private async startSystemAudioCapture(outputPath: string): Promise<void> {
    // Check if PulseAudio is available (Linux)
    try {
      await execAsync('which pactl');
      await this.startPulseAudioCapture(outputPath);
      return;
    } catch (error) {
      // PulseAudio not available, try other methods
    }

    // Check if ALSA is available (Linux fallback)
    try {
      await execAsync('which arecord');
      await this.startAlsaCapture(outputPath);
      return;
    } catch (error) {
      // ALSA not available
    }

    // Check if ffmpeg is available (cross-platform)
    try {
      await execAsync('which ffmpeg');
      await this.startFfmpegCapture(outputPath);
      return;
    } catch (error) {
      // ffmpeg not available
    }

    throw new Error('No audio capture tools available. Please install pulseaudio-utils, alsa-utils, or ffmpeg.');
  }

  /**
   * Start audio capture using PulseAudio (Linux)
   */
  private async startPulseAudioCapture(outputPath: string): Promise<void> {
    // Get default audio sink for system audio capture
    const { stdout } = await execAsync('pactl get-default-sink');
    const defaultSink = stdout.trim();

    // Start recording from the monitor source
    this.recordingProcess = spawn('parecord', [
      '--device', `${defaultSink}.monitor`,
      '--file-format', 'wav',
      '--channels', '2',
      '--rate', '44100',
      outputPath
    ]);

    this.recordingProcess.on('error', (error: Error) => {
      console.error('PulseAudio recording error:', error);
      this.setState({ status: 'ERROR', error: error.message });
    });

    this.recordingProcess.on('exit', (code: number) => {
      if (code !== 0 && this.currentState.status === 'RECORDING') {
        console.error(`PulseAudio recording exited with code ${code}`);
        this.setState({ status: 'ERROR', error: `Recording process exited with code ${code}` });
      }
    });

    console.log('Started PulseAudio recording to:', outputPath);
  }

  /**
   * Start audio capture using ALSA (Linux fallback)
   */
  private async startAlsaCapture(outputPath: string): Promise<void> {
    // Use ALSA's arecord for audio capture
    this.recordingProcess = spawn('arecord', [
      '-D', 'pulse',  // Use PulseAudio through ALSA
      '-f', 'cd',     // CD quality (16-bit, 44.1kHz, stereo)
      '-t', 'wav',    // WAV format
      outputPath
    ]);

    this.recordingProcess.on('error', (error: Error) => {
      console.error('ALSA recording error:', error);
      this.setState({ status: 'ERROR', error: error.message });
    });

    this.recordingProcess.on('exit', (code: number) => {
      if (code !== 0 && this.currentState.status === 'RECORDING') {
        console.error(`ALSA recording exited with code ${code}`);
        this.setState({ status: 'ERROR', error: `Recording process exited with code ${code}` });
      }
    });

    console.log('Started ALSA recording to:', outputPath);
  }

  /**
   * Start audio capture using FFmpeg (cross-platform)
   */
  private async startFfmpegCapture(outputPath: string): Promise<void> {
    // Use ffmpeg to capture system audio
    // This is a basic implementation - specific input device may vary by system
    this.recordingProcess = spawn('ffmpeg', [
      '-f', 'pulse',          // Use PulseAudio input
      '-i', 'default',        // Default audio source
      '-ac', '2',             // Stereo
      '-ar', '44100',         // Sample rate
      '-y',                   // Overwrite output file
      outputPath
    ]);

    this.recordingProcess.on('error', (error: Error) => {
      console.error('FFmpeg recording error:', error);
      this.setState({ status: 'ERROR', error: error.message });
    });

    this.recordingProcess.on('exit', (code: number) => {
      if (code !== 0 && this.currentState.status === 'RECORDING') {
        console.error(`FFmpeg recording exited with code ${code}`);
        this.setState({ status: 'ERROR', error: `Recording process exited with code ${code}` });
      }
    });

    console.log('Started FFmpeg recording to:', outputPath);
  }

  /**
   * Enhanced Zoom detection using desktop capturer and process detection
   */
  async detectZoomMeeting(): Promise<boolean> {
    try {
      // First check for Zoom processes
      const processCheck = await this.checkMeetingApplications('zoom');
      if (processCheck.meetingDetected) {
        return true;
      }

      // Enhanced detection using desktop capturer to look for Zoom windows
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        fetchWindowIcons: false
      });

      const zoomWindows = sources.filter(source =>
        source.name.toLowerCase().includes('zoom') ||
        source.name.toLowerCase().includes('meeting')
      );

      return zoomWindows.length > 0;
    } catch (error) {
      console.error('Error detecting Zoom meeting:', error);
      return false;
    }
  }
}

// Global recording manager instance
const recordingManager = new RecordingManager();

// ============================================================================
// IPC Message Handlers
// ============================================================================

/**
 * Handle incoming IPC messages from parent process
 */
async function handleIPCMessage(message: any): Promise<IPCResponse> {
  if (!isIPCRequest(message)) {
    return createIPCErrorResponse(
      message.id || 'unknown',
      IPC_ERROR_CODES.INVALID_REQUEST,
      'Invalid JSON-RPC request format'
    );
  }

  try {
    switch (message.method) {
      case 'startRecording':
        const startResult = await recordingManager.startRecording(message.params || {});
        return createIPCResponse(message.id, startResult);

      case 'stopRecording':
        const stopResult = await recordingManager.stopRecording();
        return createIPCResponse(message.id, stopResult);

      case 'getStatus':
        const statusResult = await recordingManager.getSystemStatus();
        return createIPCResponse(message.id, statusResult);

      case 'checkMeeting':
        const meetingResult = await recordingManager.checkMeetingApplications(
          message.params?.application
        );
        return createIPCResponse(message.id, meetingResult);

      default:
        return createIPCErrorResponse(
          message.id,
          IPC_ERROR_CODES.METHOD_NOT_FOUND,
          `Method '${message.method}' not found`
        );
    }
  } catch (error) {
    console.error('Error handling IPC message:', error);

    // Map specific errors to appropriate error codes
    let errorCode: IPCErrorCode = IPC_ERROR_CODES.INTERNAL_ERROR;
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('No active meeting found')) {
      errorCode = IPC_ERROR_CODES.NO_MEETING_FOUND;
    } else if (errorMessage.includes('Recording already in progress')) {
      errorCode = IPC_ERROR_CODES.RECORDING_IN_PROGRESS;
    } else if (errorMessage.includes('No recording in progress')) {
      errorCode = IPC_ERROR_CODES.INVALID_REQUEST;
    }

    return createIPCErrorResponse(message.id, errorCode, errorMessage);
  }
}

// ============================================================================
// Electron Application Setup
// ============================================================================

/**
 * Initialize Electron application in headless mode
 */
async function initializeElectronApp() {
  console.log('Starting Electron Audio Capture Process...');

  // Wait for Electron to be ready
  await app.whenReady();

  // Prevent the app from quitting when all windows are closed
  // This keeps the headless process running
  app.on('window-all-closed', () => {
    // Do nothing - keep the app running headlessly
  });

  // Handle IPC messages from parent process
  process.on('message', async (message: any) => {
    try {
      const response = await handleIPCMessage(message);

      // Send response back to parent process
      if (process.send) {
        process.send(response);
      }
    } catch (error) {
      console.error('Error processing IPC message:', error);

      // Send error response
      if (process.send) {
        process.send(createIPCErrorResponse(
          message.id || 'unknown',
          IPC_ERROR_CODES.INTERNAL_ERROR,
          'Failed to process IPC message'
        ));
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');

    // Stop any ongoing recording
    try {
      if (recordingManager.getState().status === 'RECORDING') {
        await recordingManager.stopRecording();
      }
    } catch (error) {
      console.error('Error stopping recording during shutdown:', error);
    }

    app.quit();
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');

    // Stop any ongoing recording
    try {
      if (recordingManager.getState().status === 'RECORDING') {
        await recordingManager.stopRecording();
      }
    } catch (error) {
      console.error('Error stopping recording during shutdown:', error);
    }

    app.quit();
  });

  console.log('Electron Audio Capture Process initialized successfully');
}

// ============================================================================
// Application Entry Point
// ============================================================================

// Start the application
initializeElectronApp().catch((error) => {
  console.error('Failed to initialize Electron Audio Capture Process:', error);
  process.exit(1);
});
