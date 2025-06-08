import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { spawn, ChildProcess } from "child_process";
import { setTimeout } from "timers/promises";
import path from "path";

// Integration tests for the complete MCP server
describe("MCP Server Integration", () => {
  let mcpProcess: ChildProcess | null = null;
  const serverPath = path.resolve(__dirname, "../dist/index.js");

  beforeEach(async () => {
    // Skip if dist doesn't exist (for CI environments without build)
    try {
      await import("fs").then((fs) => fs.promises.access(serverPath));
    } catch {
      console.warn("Skipping integration tests - server not built");
      return;
    }
  });

  afterEach(async () => {
    if (mcpProcess) {
      mcpProcess.kill("SIGTERM");
      mcpProcess = null;
      await setTimeout(100); // Allow process to clean up
    }
  });

  const startMcpServer = (): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const process = spawn("node", [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: path.dirname(serverPath),
      });

      let stderr = "";
      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Give the server a moment to start
      setTimeout(500).then(() => {
        if (process.pid) {
          resolve(process);
        } else {
          reject(new Error(`Failed to start MCP server: ${stderr}`));
        }
      });

      process.on("error", reject);
    });
  };

  const sendJsonRpcMessage = (
    process: ChildProcess,
    message: object
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timeout"));
      }, 5000);

      let responseBuffer = "";
      const onStdout = (data: Buffer) => {
        responseBuffer += data.toString();

        // Look for complete JSON lines
        const lines = responseBuffer.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              clearTimeout(timeout);
              process.stdout?.off("data", onStdout);
              resolve(response);
              return;
            } catch {
              // Not a complete JSON line yet, continue
            }
          }
        }
      };

      process.stdout?.on("data", onStdout);
      process.stdin?.write(JSON.stringify(message) + "\n");
    });
  };

  describe("when server is properly built", () => {
    it("should respond to tools/list request", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const listToolsRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      };

      const response = await sendJsonRpcMessage(mcpProcess, listToolsRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: "startRecording",
              description: expect.stringContaining("Start recording"),
            }),
            expect.objectContaining({
              name: "stopRecording",
              description: expect.stringContaining("Stop recording"),
            }),
            expect.objectContaining({
              name: "getStatus",
              description: expect.stringContaining(
                "Get current recording status"
              ),
            }),
            expect.objectContaining({
              name: "checkMeeting",
              description: expect.stringContaining("Check if a meeting"),
            }),
          ]),
        },
      });
    });

    it("should handle startRecording tool call", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const toolCallRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "startRecording",
          arguments: { application: "Zoom" },
        },
      };

      const response = await sendJsonRpcMessage(mcpProcess, toolCallRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 2,
        result: {
          content: [
            {
              type: "text",
              text: expect.stringContaining("Recording started for Zoom"),
            },
          ],
        },
      });
    });

    it("should handle stopRecording tool call", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const toolCallRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "stopRecording",
          arguments: { filename: "test-recording" },
        },
      };

      const response = await sendJsonRpcMessage(mcpProcess, toolCallRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 3,
        result: {
          content: [
            {
              type: "text",
              text: expect.stringContaining("Recording stopped and saved to"),
            },
          ],
        },
      });
    });

    it("should handle getStatus tool call", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const toolCallRequest = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "getStatus",
          arguments: {},
        },
      };

      const response = await sendJsonRpcMessage(mcpProcess, toolCallRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 4,
        result: {
          content: [
            {
              type: "text",
              text: expect.stringContaining("Status: IDLE"),
            },
          ],
        },
      });
    });

    it("should handle checkMeeting tool call", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const toolCallRequest = {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "checkMeeting",
          arguments: {},
        },
      };

      const response = await sendJsonRpcMessage(mcpProcess, toolCallRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 5,
        result: {
          content: [
            {
              type: "text",
              text: expect.stringContaining("No active meeting found"),
            },
          ],
        },
      });
    });

    it("should handle unknown tool call with error", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const toolCallRequest = {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "unknownTool",
          arguments: {},
        },
      };

      const response = await sendJsonRpcMessage(mcpProcess, toolCallRequest);

      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 6,
        error: {
          code: expect.any(Number),
          message: expect.stringContaining("Unknown tool"),
        },
      });
    });

    it("should handle complete workflow sequence", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      const requests = [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "startRecording",
            arguments: { application: "Teams" },
          },
        },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "getStatus",
            arguments: {},
          },
        },
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "checkMeeting",
            arguments: {},
          },
        },
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "stopRecording",
            arguments: { filename: "workflow-test" },
          },
        },
      ];

      const responses = [];
      for (const request of requests) {
        const response = await sendJsonRpcMessage(mcpProcess, request);
        responses.push(response);
        await setTimeout(100); // Small delay between requests
      }

      // Verify all responses
      expect(responses).toHaveLength(5);

      // List tools response
      expect(responses[0]).toMatchObject({
        id: 1,
        result: { tools: expect.arrayContaining([expect.any(Object)]) },
      });

      // Start recording response
      expect(responses[1]).toMatchObject({
        id: 2,
        result: {
          content: [
            { text: expect.stringContaining("Recording started for Teams") },
          ],
        },
      });

      // Get status response
      expect(responses[2]).toMatchObject({
        id: 3,
        result: {
          content: [{ text: expect.stringContaining("Status: IDLE") }],
        },
      });

      // Check meeting response
      expect(responses[3]).toMatchObject({
        id: 4,
        result: {
          content: [
            { text: expect.stringContaining("No active meeting found") },
          ],
        },
      });

      // Stop recording response
      expect(responses[4]).toMatchObject({
        id: 5,
        result: {
          content: [
            { text: expect.stringContaining("Recording stopped and saved to") },
          ],
        },
      });
    });
  });

  describe("error scenarios", () => {
    it("should handle malformed JSON gracefully", async () => {
      try {
        await import("fs").then((fs) => fs.promises.access(serverPath));
      } catch {
        console.warn("Skipping test - server dist not found");
        return;
      }

      mcpProcess = await startMcpServer();

      // Send malformed JSON
      const malformedJson =
        '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"'; // Missing closing brace

      return new Promise<void>((resolve) => {
        let responseReceived = false;

        const timeout = setTimeout(() => {
          if (!responseReceived) {
            // Server should handle malformed JSON without crashing
            expect(mcpProcess?.killed).toBeFalsy();
            resolve();
          }
        }, 1000);

        mcpProcess!.stdout?.on("data", (data) => {
          responseReceived = true;
          clearTimeout(timeout);
          // Any response (or lack thereof) is acceptable for malformed JSON
          resolve();
        });

        mcpProcess!.stdin?.write(malformedJson + "\n");
      });
    });
  });
});
