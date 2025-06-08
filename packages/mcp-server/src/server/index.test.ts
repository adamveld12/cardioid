import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockedFunction,
} from "vitest";
import { McpServer } from "./index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Mock the MCP SDK modules
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../tools/index.js", () => ({
  tools: [
    { name: "startRecording", description: "Start recording" },
    { name: "stopRecording", description: "Stop recording" },
    { name: "getStatus", description: "Get status" },
    { name: "checkMeeting", description: "Check meeting" },
  ],
  handleToolCall: vi.fn(),
}));

describe("McpServer", () => {
  let mcpServer: McpServer;
  let mockServer: any;
  let mockTransport: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create a new instance for each test
    mcpServer = new McpServer();

    // Get references to the mocked instances
    mockServer = vi.mocked(Server).mock.results[0].value;
    mockTransport = vi.mocked(StdioServerTransport).mock.results[0].value;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create StdioServerTransport instance", () => {
      expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    });

    it("should create Server instance with correct configuration", () => {
      expect(Server).toHaveBeenCalledTimes(1);
      expect(Server).toHaveBeenCalledWith(
        {
          name: "cardioid",
          version: "0.1.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    });

    it("should set up request handlers", () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("handler setup", () => {
    it("should register ListToolsRequestSchema handler", () => {
      const handlerCalls = mockServer.setRequestHandler.mock.calls;

      // Find the ListToolsRequestSchema handler call
      const listToolsCall = handlerCalls.find(
        (call) =>
          call[0].toString().includes("tools/list") ||
          call[0].method === "tools/list"
      );

      expect(listToolsCall).toBeDefined();
    });

    it("should register CallToolRequestSchema handler", () => {
      const handlerCalls = mockServer.setRequestHandler.mock.calls;

      // Find the CallToolRequestSchema handler call
      const callToolCall = handlerCalls.find(
        (call) =>
          call[0].toString().includes("tools/call") ||
          call[0].method === "tools/call"
      );

      expect(callToolCall).toBeDefined();
    });

    describe("ListTools handler", () => {
      it("should return tools array when called", async () => {
        const handlerCalls = mockServer.setRequestHandler.mock.calls;
        const listToolsHandler = handlerCalls[0][1]; // First handler should be ListTools

        const result = await listToolsHandler();

        expect(result).toEqual({
          tools: expect.arrayContaining([
            expect.objectContaining({ name: "startRecording" }),
            expect.objectContaining({ name: "stopRecording" }),
            expect.objectContaining({ name: "getStatus" }),
            expect.objectContaining({ name: "checkMeeting" }),
          ]),
        });
      });
    });

    describe("CallTool handler", () => {
      it("should call handleToolCall with correct parameters", async () => {
        const { handleToolCall } = await import("../tools/index.js");
        const mockHandleToolCall = handleToolCall as MockedFunction<
          typeof handleToolCall
        >;

        const handlerCalls = mockServer.setRequestHandler.mock.calls;
        const callToolHandler = handlerCalls[1][1]; // Second handler should be CallTool

        const mockRequest = {
          params: {
            name: "startRecording",
            arguments: { application: "Zoom" },
          },
        };

        mockHandleToolCall.mockResolvedValue({
          content: [{ type: "text", text: "Mock result" }],
        });

        const result = await callToolHandler(mockRequest);

        expect(mockHandleToolCall).toHaveBeenCalledWith("startRecording", {
          application: "Zoom",
        });
        expect(result).toEqual({
          content: [{ type: "text", text: "Mock result" }],
        });
      });
    });
  });

  describe("start method", () => {
    it("should connect server to transport when not running", async () => {
      mockServer.connect.mockResolvedValue(undefined);

      await mcpServer.start();

      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it("should not connect if already running", async () => {
      mockServer.connect.mockResolvedValue(undefined);

      // Start once
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(1);

      // Try to start again
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it("should handle connection errors", async () => {
      const error = new Error("Connection failed");
      mockServer.connect.mockRejectedValue(error);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(mcpServer.start()).rejects.toThrow("Connection failed");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to start MCP server:",
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe("stop method", () => {
    it("should close server when running", async () => {
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Start the server first
      await mcpServer.start();

      // Then stop it
      await mcpServer.stop();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it("should not close if not running", async () => {
      mockServer.close.mockResolvedValue(undefined);

      await mcpServer.stop();

      expect(mockServer.close).not.toHaveBeenCalled();
    });

    it("should handle close errors", async () => {
      const error = new Error("Close failed");
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockRejectedValue(error);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Start the server first
      await mcpServer.start();

      // Then try to stop it
      await expect(mcpServer.stop()).rejects.toThrow("Close failed");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to stop MCP server:",
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe("server lifecycle", () => {
    it("should handle multiple start/stop cycles", async () => {
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Cycle 1
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(1);

      await mcpServer.stop();
      expect(mockServer.close).toHaveBeenCalledTimes(1);

      // Cycle 2
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(2);

      await mcpServer.stop();
      expect(mockServer.close).toHaveBeenCalledTimes(2);
    });

    it("should maintain correct running state throughout lifecycle", async () => {
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Initially not running - multiple stops should be safe
      await mcpServer.stop();
      await mcpServer.stop();
      expect(mockServer.close).not.toHaveBeenCalled();

      // Start and verify running state
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(1);

      // Multiple starts should be safe
      await mcpServer.start();
      await mcpServer.start();
      expect(mockServer.connect).toHaveBeenCalledTimes(1);

      // Stop and verify not running state
      await mcpServer.stop();
      expect(mockServer.close).toHaveBeenCalledTimes(1);

      // Multiple stops should be safe again
      await mcpServer.stop();
      await mcpServer.stop();
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("should handle rapid start/stop sequences", async () => {
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      const promises = [];

      // Rapidly start and stop multiple times
      for (let i = 0; i < 5; i++) {
        promises.push(mcpServer.start());
        promises.push(mcpServer.stop());
      }

      await Promise.all(promises);

      // Should have been called multiple times but exact count depends on timing
      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should handle concurrent start calls", async () => {
      mockServer.connect.mockResolvedValue(undefined);

      const startPromises = [
        mcpServer.start(),
        mcpServer.start(),
        mcpServer.start(),
      ];

      await Promise.all(startPromises);

      // Should only connect once despite multiple concurrent calls
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
    });
  });
});
