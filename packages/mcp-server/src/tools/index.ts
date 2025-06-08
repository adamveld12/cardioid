import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tool definitions for MCP server
 */
export const startRecordingTool: Tool = {
  name: "startRecording",
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
    additionalProperties: false,
  },
};

export const stopRecordingTool: Tool = {
  name: "stopRecording",
  description: "Stop recording and save WAV file",
  inputSchema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "Optional filename for the recording (without extension)",
      },
      outputDirectory: {
        type: "string",
        description: "Optional output directory for the WAV file",
      },
    },
    additionalProperties: false,
  },
};

export const getStatusTool: Tool = {
  name: "getStatus",
  description: "Get current recording status",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export const checkMeetingTool: Tool = {
  name: "checkMeeting",
  description: "Check if a meeting is currently active (Zoom detection)",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

// Tool definitions array
export const tools: Tool[] = [
  startRecordingTool,
  stopRecordingTool,
  getStatusTool,
  checkMeetingTool,
];

/**
 * Tool handler functions for MCP server - STUB IMPLEMENTATIONS
 */
export async function handleToolCall(
  name: string,
  arguments_: unknown
): Promise<CallToolResult> {
  try {
    switch (name) {
      case "startRecording":
        return await handleStartRecording(
          arguments_ as { application?: string }
        );
      case "stopRecording":
        return await handleStopRecording(
          arguments_ as { filename?: string; outputDirectory?: string }
        );
      case "getStatus":
        return await handleGetStatus();
      case "checkMeeting":
        return await handleCheckMeeting();
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function handleStartRecording(args: {
  application?: string;
}): Promise<CallToolResult> {
  // STUB: Return mock response for starting recording
  const application = args.application || "System";

  return {
    content: [
      {
        type: "text",
        text: `✅ Recording started for ${application}. This is a stub implementation - no actual recording is taking place yet.`,
      },
    ],
  };
}

async function handleStopRecording(args: {
  filename?: string;
  outputDirectory?: string;
}): Promise<CallToolResult> {
  // STUB: Return mock response for stopping recording
  const filename = args.filename || "recording";
  const outputDir = args.outputDirectory || "/tmp";
  const mockPath = `${outputDir}/${filename}.wav`;

  return {
    content: [
      {
        type: "text",
        text: `✅ Recording stopped and saved to ${mockPath}. This is a stub implementation - no actual file was created.`,
      },
    ],
  };
}

async function handleGetStatus(): Promise<CallToolResult> {
  // STUB: Return mock status response
  return {
    content: [
      {
        type: "text",
        text: "Status: IDLE - No recording in progress. This is a stub implementation.",
      },
    ],
  };
}

async function handleCheckMeeting(): Promise<CallToolResult> {
  // STUB: Return mock meeting check response
  return {
    content: [
      {
        type: "text",
        text: "❌ No active meeting found. This is a stub implementation - no actual meeting detection is implemented yet.",
      },
    ],
  };
}
