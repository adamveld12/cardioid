import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { EnvironmentConfig } from "../config/environment";
import { tools, handleToolCall } from "../handlers/tools";

/**
 * MCP Server implementation for the Cardioid audio recording application
 */
export class CardioIdMcpServer {
  private server: Server;
  private transport: StdioServerTransport;
  private isRunning = false;

  constructor() {
    // Create STDIO transport
    this.transport = new StdioServerTransport();

    // Create MCP server
    this.server = new Server(
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

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await handleToolCall(name, args);
    });
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Validate environment configuration
      EnvironmentConfig.validateEnvironment();

      // Connect server to transport
      await this.server.connect(this.transport);
      this.isRunning = true;

      if (EnvironmentConfig.isDevelopment()) {
        console.error("MCP Server started in development mode");
      }
    } catch (error) {
      console.error("Failed to start MCP server:", error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.server.close();
      this.isRunning = false;

      if (EnvironmentConfig.isDevelopment()) {
        console.error("MCP Server stopped");
      }
    } catch (error) {
      console.error("Failed to stop MCP server:", error);
      throw error;
    }
  }
}

export default CardioIdMcpServer;
