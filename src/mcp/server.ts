import {
  McpServer,
  McpStreamTransport,
  McpTool,
} from "@modelcontextprotocol/sdk";
import { EnvironmentConfig } from "../config/environment";

/**
 * MCP Server implementation for the Cardioid audio recording application
 */
export class CardioIdMcpServer {
  private server: McpServer;
  private isRunning = false;

  constructor(private tools: McpTool[]) {
    // Create a new MCP server using STDIO transport
    this.server = new McpServer({
      transport: new McpStreamTransport({
        input: process.stdin,
        output: process.stdout,
      }),
      tools: this.tools,
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

      // Listen for server errors
      this.server.on("error", (err) => {
        console.error("MCP Server error:", err);
      });

      // Start the server
      await this.server.start();
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
      await this.server.stop();
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
