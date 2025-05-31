#!/usr/bin/env node

import CardioIdMcpServer from "./mcp/server";
import RecordingEngine from "./recording/engine";
import { EnvironmentConfig } from "./config/environment";

// Global recording engine instance
let recordingEngine: RecordingEngine | null = null;

/**
 * Main entry point for the Cardioid MCP Server
 */
async function main() {
  try {
    console.error("Starting Cardioid MCP Server...");

    // Create and initialize recording engine
    recordingEngine = new RecordingEngine();

    // Create and start MCP server
    const mcpServer = new CardioIdMcpServer();
    await mcpServer.start();

    // Handle process termination
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.error(`Cardioid MCP Server started successfully`);
    console.error(
      `Max recording length: ${EnvironmentConfig.getMaxRecordingLength()} seconds`
    );
    console.error(
      `Output directory: ${EnvironmentConfig.getOutputDirectory()}`
    );

    // Keep process alive by waiting indefinitely
    // The MCP server will handle communication via STDIO
    await new Promise(() => {}); // Keep process running
  } catch (error) {
    console.error("Failed to start Cardioid MCP Server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown function
 */
async function shutdown() {
  console.error("Shutting down Cardioid MCP Server...");

  try {
    // Clean up recording engine resources
    if (recordingEngine) {
      await recordingEngine.cleanup();
    }

    // Exit process
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
