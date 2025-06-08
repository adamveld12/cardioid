#!/usr/bin/env node

/**
 * Simple test script to verify MCP server tool functionality
 * This sends MCP messages to test the stub implementations
 */

import { spawn } from "child_process";
import { setTimeout } from "timers/promises";

const mcpServer = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  cwd: process.cwd(),
});

// Test messages to send to the MCP server
const testMessages = [
  // List tools request
  {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  },
  // Start recording request
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "startRecording",
      arguments: { application: "Zoom" },
    },
  },
  // Get status request
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "getStatus",
      arguments: {},
    },
  },
  // Check meeting request
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "checkMeeting",
      arguments: {},
    },
  },
  // Stop recording request
  {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "stopRecording",
      arguments: { filename: "test-recording" },
    },
  },
];

async function runTest() {
  console.log("🧪 Testing Cardioid MCP Server stub implementation...\n");

  // Set up response handler
  let responseBuffer = "";
  mcpServer.stdout.on("data", (data) => {
    responseBuffer += data.toString();

    // Process complete JSON lines
    const lines = responseBuffer.split("\n");
    responseBuffer = lines.pop() || ""; // Keep incomplete line in buffer

    lines.forEach((line) => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log("📤 Response:", JSON.stringify(response, null, 2));
          console.log("");
        } catch (e) {
          console.log("📤 Non-JSON response:", line);
        }
      }
    });
  });

  // Wait for server to start
  await setTimeout(1000);

  // Send test messages
  for (const [index, message] of testMessages.entries()) {
    console.log(
      `📩 Test ${index + 1}: ${message.method} - ${
        message.params.name || "list"
      }`
    );
    console.log("📥 Request:", JSON.stringify(message, null, 2));

    mcpServer.stdin.write(JSON.stringify(message) + "\n");

    // Wait between messages
    await setTimeout(500);
  }

  // Wait for final responses
  await setTimeout(1000);

  console.log("✅ Test completed! Shutting down server...");
  mcpServer.kill("SIGTERM");
}

runTest().catch(console.error);
