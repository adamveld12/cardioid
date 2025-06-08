import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  tools,
  handleToolCall,
  startRecordingTool,
  stopRecordingTool,
  getStatusTool,
  checkMeetingTool,
} from "./index.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

describe("MCP Tools", () => {
  describe("Tool Definitions", () => {
    describe("startRecordingTool", () => {
      it("should have correct name and description", () => {
        expect(startRecordingTool.name).toBe("startRecording");
        expect(startRecordingTool.description).toBe(
          "Start recording audio from the system and microphone"
        );
      });

      it("should have valid input schema for application parameter", () => {
        const schema = startRecordingTool.inputSchema;
        expect(schema.type).toBe("object");
        expect(schema.properties?.application).toEqual({
          type: "string",
          description:
            "Optional target application (Zoom, Google Meet, Slack, Teams)",
          enum: ["Zoom", "Google Meet", "Slack", "Teams"],
        });
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe("stopRecordingTool", () => {
      it("should have correct name and description", () => {
        expect(stopRecordingTool.name).toBe("stopRecording");
        expect(stopRecordingTool.description).toBe(
          "Stop recording and save WAV file"
        );
      });

      it("should have valid input schema for filename and outputDirectory", () => {
        const schema = stopRecordingTool.inputSchema;
        expect(schema.type).toBe("object");
        expect(schema.properties?.filename).toEqual({
          type: "string",
          description:
            "Optional filename for the recording (without extension)",
        });
        expect(schema.properties?.outputDirectory).toEqual({
          type: "string",
          description: "Optional output directory for the WAV file",
        });
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe("getStatusTool", () => {
      it("should have correct name and description", () => {
        expect(getStatusTool.name).toBe("getStatus");
        expect(getStatusTool.description).toBe("Get current recording status");
      });

      it("should have empty input schema", () => {
        const schema = getStatusTool.inputSchema;
        expect(schema.type).toBe("object");
        expect(schema.properties).toEqual({});
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe("checkMeetingTool", () => {
      it("should have correct name and description", () => {
        expect(checkMeetingTool.name).toBe("checkMeeting");
        expect(checkMeetingTool.description).toBe(
          "Check if a meeting is currently active (Zoom detection)"
        );
      });

      it("should have empty input schema", () => {
        const schema = checkMeetingTool.inputSchema;
        expect(schema.type).toBe("object");
        expect(schema.properties).toEqual({});
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe("tools array", () => {
      it("should contain all four tools", () => {
        expect(tools).toHaveLength(4);
        expect(tools).toContain(startRecordingTool);
        expect(tools).toContain(stopRecordingTool);
        expect(tools).toContain(getStatusTool);
        expect(tools).toContain(checkMeetingTool);
      });

      it("should have unique tool names", () => {
        const names = tools.map((tool) => tool.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });
    });
  });

  describe("Tool Handler Functions", () => {
    describe("handleToolCall", () => {
      describe("when calling startRecording", () => {
        it("should return success message with default application", async () => {
          const result = await handleToolCall("startRecording", {});

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "✅ Recording started for System. This is a stub implementation - no actual recording is taking place yet.",
          });
        });

        it("should return success message with specified application", async () => {
          const result = await handleToolCall("startRecording", {
            application: "Zoom",
          });

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "✅ Recording started for Zoom. This is a stub implementation - no actual recording is taking place yet.",
          });
        });

        it("should handle all supported applications", async () => {
          const applications = ["Zoom", "Google Meet", "Slack", "Teams"];

          for (const app of applications) {
            const result = await handleToolCall("startRecording", {
              application: app,
            });
            expect(result.content[0].text).toContain(
              `Recording started for ${app}`
            );
          }
        });
      });

      describe("when calling stopRecording", () => {
        it("should return success message with default filename and directory", async () => {
          const result = await handleToolCall("stopRecording", {});

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "✅ Recording stopped and saved to /tmp/recording.wav. This is a stub implementation - no actual file was created.",
          });
        });

        it("should return success message with custom filename", async () => {
          const result = await handleToolCall("stopRecording", {
            filename: "my-meeting",
          });

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "✅ Recording stopped and saved to /tmp/my-meeting.wav. This is a stub implementation - no actual file was created.",
          });
        });

        it("should return success message with custom output directory", async () => {
          const result = await handleToolCall("stopRecording", {
            filename: "conference",
            outputDirectory: "/home/user/recordings",
          });

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "✅ Recording stopped and saved to /home/user/recordings/conference.wav. This is a stub implementation - no actual file was created.",
          });
        });
      });

      describe("when calling getStatus", () => {
        it("should return idle status message", async () => {
          const result = await handleToolCall("getStatus", {});

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "Status: IDLE - No recording in progress. This is a stub implementation.",
          });
        });
      });

      describe("when calling checkMeeting", () => {
        it("should return no meeting found message", async () => {
          const result = await handleToolCall("checkMeeting", {});

          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toEqual({
            type: "text",
            text: "❌ No active meeting found. This is a stub implementation - no actual meeting detection is implemented yet.",
          });
        });
      });

      describe("error handling", () => {
        it("should throw McpError for unknown tool name", async () => {
          await expect(handleToolCall("unknownTool", {})).rejects.toThrow(
            McpError
          );

          try {
            await handleToolCall("unknownTool", {});
          } catch (error) {
            expect(error).toBeInstanceOf(McpError);
            expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
            expect((error as McpError).message).toBe(
              "Unknown tool: unknownTool"
            );
          }
        });

        it("should handle and wrap non-McpError exceptions", async () => {
          // This test would require mocking internal functions to throw errors
          // For now, we test the basic error handling structure
          const invalidToolName = null as any;

          await expect(handleToolCall(invalidToolName, {})).rejects.toThrow();
        });
      });
    });
  });

  describe("Integration Tests", () => {
    describe("tool workflow scenarios", () => {
      it("should handle complete recording workflow", async () => {
        // 1. Start recording
        const startResult = await handleToolCall("startRecording", {
          application: "Zoom",
        });
        expect(startResult.content[0].text).toContain(
          "Recording started for Zoom"
        );

        // 2. Check status
        const statusResult = await handleToolCall("getStatus", {});
        expect(statusResult.content[0].text).toContain("Status: IDLE");

        // 3. Check meeting
        const meetingResult = await handleToolCall("checkMeeting", {});
        expect(meetingResult.content[0].text).toContain(
          "No active meeting found"
        );

        // 4. Stop recording
        const stopResult = await handleToolCall("stopRecording", {
          filename: "zoom-call",
        });
        expect(stopResult.content[0].text).toContain(
          "Recording stopped and saved to /tmp/zoom-call.wav"
        );
      });

      it("should handle multiple consecutive tool calls", async () => {
        const calls = [
          { name: "startRecording", args: { application: "Teams" } },
          { name: "getStatus", args: {} },
          { name: "checkMeeting", args: {} },
          {
            name: "stopRecording",
            args: { filename: "teams-meeting", outputDirectory: "/recordings" },
          },
        ];

        const results = [];
        for (const call of calls) {
          const result = await handleToolCall(call.name, call.args);
          results.push(result);
        }

        expect(results).toHaveLength(4);
        expect(results[0].content[0].text).toContain(
          "Recording started for Teams"
        );
        expect(results[1].content[0].text).toContain("Status: IDLE");
        expect(results[2].content[0].text).toContain("No active meeting found");
        expect(results[3].content[0].text).toContain(
          "Recording stopped and saved to /recordings/teams-meeting.wav"
        );
      });
    });
  });
});
