import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ElectronBridge } from "../electron-bridge"; // Added import

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
  const electronBridge = ElectronBridge.getInstance(); // Get ElectronBridge instance
  try {
    switch (name) {
      case "startRecording":
        // return await handleStartRecording(
        //   arguments_ as { application?: string }
        // );
        const startResult = await electronBridge.startRecording(
          arguments_ as { application?: string }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(startResult) }],
        };
      case "stopRecording":
        // return await handleStopRecording(
        //   arguments_ as { filename?: string; outputDirectory?: string }
        // );
        const stopResult = await electronBridge.stopRecording(
          arguments_ as { filename?: string; outputDirectory?: string }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(stopResult) }],
        };
      case "getStatus":
        // return await handleGetStatus();
        // Assuming getAudioDevices is a proxy for a general status for now
        const statusResult = await electronBridge.getAudioDevices();
        return {
          content: [
            { type: "text", text: `Status: ${JSON.stringify(statusResult)}` },
          ],
        };
      case "checkMeeting":
        // return await handleCheckMeeting();
        // No direct equivalent in ElectronBridge yet, returning a placeholder
        return {
          content: [
            {
              type: "text",
              text: "checkMeeting is not yet implemented with ElectronBridge.",
            },
          ],
        };
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
