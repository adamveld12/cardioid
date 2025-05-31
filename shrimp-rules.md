# Cardioid MCP Server Development Guidelines

## Project Overview

- **Project Name**: Cardioid - Audio Recording MCP Server
- **Technology Stack**: Node.js, TypeScript, Electron, PNPM
- **Core Purpose**: Model Context Protocol server for meeting audio recording
- **Target Platforms**: Windows, macOS
- **Primary Dependencies**: @modelcontextprotocol/sdk, Electron

## Project Architecture

### Core Components Structure

- **MCP Server Layer**: Use @modelcontextprotocol/sdk with STDIO transport
- **Recording Engine**: Electron-based audio capture using desktopCapturer API
- **Command Handlers**: Three main tools implementation
- **Configuration Management**: Environment variable based configuration

### Directory Structure Requirements

- **src/**: Main source code directory
  - **mcp/**: MCP server implementation
  - **recording/**: Audio recording engine
  - **handlers/**: Command handler implementations
  - **config/**: Configuration management
- **docs/**: Project documentation (existing)
- **dist/**: Compiled output
- **package.json**: Must include npx executable configuration

## Tool Naming Standards

### **CRITICAL**: Resolve Specification Conflicts

- **Use Product Spec Names**: `record`, `stop`, `status` (NOT technical spec names)
- **Product spec takes precedence** over technical spec for tool names
- **Maintain internal consistency** across all implementation files

### Tool Implementation Requirements

#### `record` Tool
- **Function**: Start audio recording from system and microphone
- **Parameters**: Optional application target (Zoom, Google Meet, Slack, Teams)
- **Environment Variables**:
  - `CARDIOID_MAX_LENGTH` (default: "1h30m")
- **Response**: Recording status and metadata
- **Auto-stop**: When max length reached

#### `stop` Tool
- **Function**: Stop recording and save WAV file
- **Parameters**: Optional output directory
- **Environment Variables**:
  - `CARDIOID_OUTPUT_DIRECTORY` (default: system temp)
- **Response**: File path and recording metadata
- **File Format**: WAV only

#### `status` Tool
- **Function**: Get current recording state
- **Response**: Recording status, elapsed time, target application

## Code Standards

### File Naming Conventions

- **TypeScript files**: Use kebab-case (e.g., `recording-engine.ts`)
- **Class names**: PascalCase (e.g., `RecordingEngine`)
- **Function names**: camelCase (e.g., `startRecording`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_MAX_LENGTH`)

### Import/Export Standards

- **Use explicit imports**: Import specific functions/classes
- **Default exports**: Only for main classes
- **Named exports**: For utility functions and constants
- **Path aliases**: Use relative paths for project files

### Error Handling Standards

- **Use try-catch blocks** for all async operations
- **Return structured error responses** with status and message
- **Log errors** with appropriate severity levels
- **Handle platform-specific errors** separately

## Environment Variable Standards

### Required Environment Variables

- **CARDIOID_MAX_LENGTH**: Recording duration limit (format: "1h30m", "90m", "5400s")
- **CARDIOID_OUTPUT_DIRECTORY**: Output directory for WAV files
- **NODE_ENV**: Environment mode (development, production)

### Environment Variable Implementation

- **Use dotenv** for development configuration
- **Provide defaults** for all optional variables
- **Validate format** for time-based variables
- **Use path.resolve()** for directory variables

## Electron Implementation Standards

### Window Management

- **Create hidden window** for background operation
- **Maintain process** during recording
- **Handle app lifecycle events** properly
- **Implement proper cleanup** on exit

### Audio Capture Requirements

- **Use desktopCapturer API** for system audio
- **Request media permissions** appropriately
- **Support both microphone and system audio**
- **Handle audio device enumeration**

### Cross-Platform Considerations

- **Windows**: Use DirectShow/WASAPI APIs
- **macOS**: Handle Core Audio permissions
- **File paths**: Use path.join() for all path operations
- **Temporary directories**: Use os.tmpdir() as default

## MCP Server Implementation Standards

### Server Configuration

- **Transport**: STDIO only (no HTTP/WebSocket)
- **SDK Version**: Use latest @modelcontextprotocol/sdk
- **Error Handling**: Implement proper MCP error responses
- **Tool Registration**: Register all three tools during initialization

### Protocol Compliance

- **Follow MCP specification** exactly
- **Implement proper JSON-RPC responses**
- **Handle server lifecycle** (initialize, shutdown)
- **Support capability negotiation**

## Package Management Standards

### NPX Compatibility

- **Configure bin field** in package.json
- **Make executable** with proper shebang
- **Test npx installation** during development
- **Ensure all dependencies** are included

### Dependency Management

- **Use PNPM** as package manager
- **Pin exact versions** for critical dependencies
- **Separate dev and production** dependencies
- **Regular security audits** with pnpm audit

## Documentation Synchronization Rules

### **CRITICAL**: Multi-File Updates

- **When modifying docs/product_spec.md**: Update docs/technical_spec.md if changes affect implementation
- **When modifying docs/technical_spec.md**: Verify consistency with docs/product_spec.md
- **When adding new features**: Update both specification documents
- **When changing tool names**: Update ALL documentation files

### Documentation Standards

- **Use consistent terminology** across all docs
- **Maintain version compatibility** between specs
- **Include implementation examples** in technical spec
- **Update README.md** when adding new features

## Testing Standards

### Test Structure

- **Unit tests**: For individual components
- **Integration tests**: For MCP server functionality
- **E2E tests**: For complete recording workflows
- **Platform tests**: Separate tests for Windows/macOS

### Test Requirements

- **Mock Electron APIs** in unit tests
- **Test all three tools** individually
- **Test error conditions** and edge cases
- **Verify audio file output** quality and format

## Build and Release Standards

### Build Configuration

- **TypeScript compilation** to dist/
- **Electron packaging** for target platforms
- **NPX executable** generation
- **Source map generation** for debugging

### Release Process

- **Version bumping** in package.json
- **Platform-specific builds** for Windows/macOS
- **NPM registry publication**
- **GitHub releases** with platform binaries

## AI Decision-Making Standards

### Priority Hierarchy

1. **Product specification requirements** (highest priority)
2. **Technical specification implementation details**
3. **Code quality and maintainability**
4. **Cross-platform compatibility**
5. **Performance optimization** (lowest priority)

### Conflict Resolution

- **Product spec vs Technical spec**: Use product spec names and requirements
- **Cross-platform differences**: Implement platform-specific solutions
- **Performance vs Reliability**: Choose reliability for audio recording
- **Simplicity vs Features**: Implement minimum viable features first

## Prohibited Actions

### **NEVER DO**

- **Change tool names** from product spec (`record`, `stop`, `status`)
- **Use HTTP transport** for MCP server (STDIO only)
- **Store audio in formats** other than WAV
- **Hardcode file paths** without environment variable support
- **Implement without proper error handling**
- **Ignore cross-platform differences**
- **Skip audio permission requests**
- **Create visible Electron windows** during recording
- **Use synchronous file operations** for large audio files
- **Modify one spec document** without checking the other

### **ALWAYS DO**

- **Use @modelcontextprotocol/sdk** for MCP implementation
- **Implement all three required tools**
- **Support environment variable configuration**
- **Handle recording time limits** properly
- **Clean up temporary files** after operations
- **Validate input parameters** in all tools
- **Log important operations** for debugging
- **Test on both target platforms**
- **Update documentation** when making changes
- **Use TypeScript strict mode**

## Key File Interaction Standards

### Critical File Dependencies

- **package.json**: Must include MCP server bin configuration
- **src/index.ts**: Main entry point for npx execution
- **src/mcp/server.ts**: MCP server implementation
- **src/recording/engine.ts**: Core recording functionality
- **docs/*.md**: Keep specifications synchronized

### Modification Workflows

- **Adding new tool**: Update both spec documents, implement handler, update server registration
- **Changing configuration**: Update environment variable docs, implement validation, update defaults
- **Platform-specific code**: Add platform detection, implement OS-specific handlers, update build process
- **Error handling**: Add error types, update error responses, document error conditions
