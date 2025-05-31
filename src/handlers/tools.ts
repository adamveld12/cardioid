import { McpToolDefinition } from "@modelcontextprotocol/sdk";
import RecordingEngine, { RecordingStatus } from "../recording/engine";

// Singleton recording engine instance
let recordingEngine: RecordingEngine | null = null;

// Get or create the recording engine
function getRecordingEngine(): RecordingEngine {
  if (!recordingEngine) {
    recordingEngine = new RecordingEngine();
  }
  return recordingEngine;
}

/**
 * Tool handler for the 'record' command
 * Starts recording audio from the system and microphone
 */
export const recordTool: McpToolDefinition = {
  name: "record", // Use product spec name as required
  description: "Start recording audio from the system and microphone",
  inputSchema: {
    type: "object",
    properties: {
      application: {
        type: "string",
        description:
          "Optional target application (Zoom, Google Meet, Slack, Teams)",
        enum: ["Zoom", "Google Meet", "Slack", "Teams"],
      },
    },
  },
  async handler({ application }) {
    try {
      const engine = getRecordingEngine();
      const recordingState = await engine.startRecording(application);

      return {
        status: recordingState.status,
        meta: {
          application: recordingState.targetApplication,
        },
      };
    } catch (error) {
      console.error("Error handling record command:", error);
      return {
        status: RecordingStatus.ERROR,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool handler for the 'stop' command
 * Stops recording and saves WAV file
 */
export const stopTool: McpToolDefinition = {
  name: "stop", // Use product spec name as required
  description: "Stop recording and save WAV file",
  inputSchema: {
    type: "object",
    properties: {
      outputDirectory: {
        type: "string",
        description: "Optional output directory for the WAV file",
      },
    },
  },
  async handler({ outputDirectory }) {
    try {
      const engine = getRecordingEngine();
      const result = await engine.stopRecording(outputDirectory);

      return {
        path: result.path,
        meta: {
          elapsedTimeSeconds: result.meta.elapsedTimeSeconds,
          application: result.meta.application,
        },
      };
    } catch (error) {
      console.error("Error handling stop command:", error);
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Tool handler for the 'status' command
 * Gets current recording state
 */
export const statusTool: McpToolDefinition = {
  name: "status", // Use product spec name as required
  description: "Get current recording state",
  inputSchema: {
    type: "object",
    properties: {},
  },
  async handler() {
    try {
      const engine = getRecordingEngine();
      const state = engine.getStatus();

      return {
        status: state.status,
        meta: {
          elapsedTimeSeconds: state.elapsedTimeSeconds || 0,
          application: state.targetApplication || null,
        },
      };
    } catch (error) {
      console.error("Error handling status command:", error);
      return {
        status: RecordingStatus.ERROR,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export const tools = [recordTool, stopTool, statusTool];
