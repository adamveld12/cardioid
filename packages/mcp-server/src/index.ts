#!/usr/bin/env node

import { McpServer } from "./server/index.js";

/**
 * Main entry point for the Cardioid MCP Server
 */
async function main() {
  try {
    console.error("Starting Cardioid MCP Server...");

    // Create and start MCP server
    const mcpServer = new McpServer();
    await mcpServer.start();

    // Handle process termination
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.error("Cardioid MCP Server started successfully");

    // Keep process alive - MCP server handles communication via STDIO
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
  process.exit(0);
}

// Start the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
