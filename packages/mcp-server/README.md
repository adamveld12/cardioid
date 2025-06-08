# Cardioid MCP Server

This package contains the Model Context Protocol (MCP) server implementation for Cardioid, a meeting audio recording system.

## Current Status: Stub Implementation

This is a basic stub implementation that provides the core MCP tools with mock responses. The actual audio recording functionality will be implemented in future iterations.

## Available Tools

### 1. `startRecording`
Initiates audio recording from the system and microphone.

**Parameters:**
- `application` (optional): Target application ("Zoom", "Google Meet", "Slack", "Teams")

**Current Behavior:** Returns a mock success message indicating recording has started.

### 2. `stopRecording`
Stops audio recording and saves the file.

**Parameters:**
- `filename` (optional): Custom filename for the recording (without extension)
- `outputDirectory` (optional): Custom output directory for the WAV file

**Current Behavior:** Returns a mock file path where the recording would be saved.

### 3. `getStatus`
Gets the current recording status.

**Parameters:** None

**Current Behavior:** Always returns "IDLE" status with a stub message.

### 4. `checkMeeting`
Checks if a meeting is currently active (Zoom detection).

**Parameters:** None

**Current Behavior:** Always returns "No active meeting found" with a stub message.

## Architecture

The MCP server follows the project's dual-process architecture design:

- **MCP Server Process** (this package): Handles MCP protocol communication via STDIO
- **Electron Recorder Process** (future): Will handle actual audio capture
- **Shared Types** (packages/shared): Common interfaces and types

## Usage

### Development
```bash
pnpm dev  # Watch mode with TypeScript compilation
```

### Production
```bash
pnpm build  # Compile TypeScript
pnpm start  # Run the compiled server
```

### From Root
```bash
pnpm start:mcp  # Run from monorepo root
```

## Dependencies

- `@modelcontextprotocol/sdk`: Official MCP SDK for TypeScript
- `shared` (workspace): Shared types and interfaces

## Implementation Notes

This stub implementation:
- ✅ Implements all four required MCP tools
- ✅ Uses proper MCP SDK patterns with Server and StdioServerTransport
- ✅ Returns appropriate mock responses for testing
- ✅ Follows project TypeScript configuration standards
- ✅ Builds and runs successfully
- ⏳ Does not implement actual audio recording (future work)
- ⏳ Does not implement meeting detection (future work)
- ⏳ Does not communicate with Electron process (future work)

## Next Steps

1. Implement ElectronBridge class for IPC communication
2. Integrate with actual meeting detection logic
3. Connect to Electron recorder process for real audio capture
4. Add comprehensive error handling
5. Implement configuration management
