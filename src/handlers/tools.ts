import { Tool, CallToolRequestSchema, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
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
 * Tool definitions for MCP server
 */
export const recordTool: Tool = {
  name: "record",
  description: "Start recording audio from the system and microphone",
  inputSchema: {
    type: "object",
    properties: {
      application: {
        type: "string",
        description: "Optional target application (Zoom, Google Meet, Slack, Teams)",
        enum: ["Zoom", "Google Meet", "Slack", "Teams"],
      },
    },
    additionalProperties: false,
  },
};

export const stopTool: Tool = {
  name: "stop",
  description: "Stop recording and save WAV file",
  inputSchema: {
    type: "object",
    properties: {
      outputDirectory: {
        type: "string",
        description: "Optional output directory for the WAV file",
      },
    },
    additionalProperties: false,
  },
};

export const statusTool: Tool = {
  name: "status",
  description: "Get current recording state",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

// Tool definitions array
export const tools: Tool[] = [recordTool, stopTool, statusTool];

/**
 * Tool handler functions for MCP server
 */
export async function handleToolCall(name: string, arguments_: unknown): Promise<CallToolResult> {
  try {
    switch (name) {
      case "record":
        return await handleRecordTool(arguments_ as { application?: string });
      case "stop":
        return await handleStopTool(arguments_ as { outputDirectory?: string });
      case "status":
        return await handleStatusTool();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function handleRecordTool(args: { application?: string }): Promise<CallToolResult> {
  const engine = getRecordingEngine();
  const recordingState = await engine.startRecording(args.application);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: recordingState.status,
          meta: {
            application: recordingState.targetApplication,
          },
        }, null, 2),
      },
    ],
  };
}

async function handleStopTool(args: { outputDirectory?: string }): Promise<CallToolResult> {
  const engine = getRecordingEngine();
  const result = await engine.stopRecording(args.outputDirectory);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          path: result.path,
          meta: {
            elapsedTimeSeconds: result.meta.elapsedTimeSeconds,
            application: result.meta.application,
          },
        }, null, 2),
      },
    ],
  };
}

async function handleStatusTool(): Promise<CallToolResult> {
  const engine = getRecordingEngine();
  const state = engine.getStatus();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: state.status,
          meta: {
            elapsedTimeSeconds: state.elapsedTimeSeconds || 0,
            application: state.targetApplication || null,
          },
        }, null, 2),
      },
    ],
  };
}
