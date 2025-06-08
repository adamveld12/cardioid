#!/usr/bin/env node

import { McpServer } from "./server";

/**
 * Main entry point for the Cardioid MCP Server
 */
async function main() {
  try {
    console.error("Starting Cardioid MCP Server...");

    // Create and start MCP server
    const mcpServer = new McpServer();

    // Handle process termination
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await mcpServer.start();
    console.error("Cardioid MCP Server started successfully");
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
  process.exit(0);
}

// Start the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
