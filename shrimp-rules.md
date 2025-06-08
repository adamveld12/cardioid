# Cardioid Development Guidelines

## 1. Project Overview

- **Purpose**: Model Context Protocol (MCP) server for meeting audio recording with dual-process architecture.
- **Tech Stack**: Node.js + TypeScript + PNPM + Electron + @modelcontextprotocol/sdk.
- **Architecture**: Separate MCP server (Node.js) and audio capture (Electron) processes.
- **Distribution**: NPM package executable via `npx cardioid`.

## 2. Project Architecture Rules

### 2.1. Dual-Process Design
- **MUST** maintain separation between MCP server process and Electron audio capture process. (ADR-002)
- **MUST** use JSON-RPC over Node.js IPC for inter-process communication. (ADR-003)
- **NEVER** combine MCP protocol handling with audio capture in the same process. (ADR-002)
- **MUST** implement an `ElectronBridge` class in the MCP server for IPC management to the Electron process.

### 2.2. Directory Structure
- **MUST** follow this exact structure:
  ```
  /
  ├── docs/             # Documentation (ADR.md, PRD.md)
  ├── .github/          # GitHub workflows and templates
  ├── packages/
  │   ├── mcp-server/     # Node.js MCP server code
  │   ├── electron-recorder/ # Electron main process and audio capture
  │   └── shared/         # Common types, interfaces, constants
  ├── package.json      # Root PNPM workspace configuration
  ├── pnpm-workspace.yaml # PNPM workspace definition
  ├── tsconfig.base.json # Base TypeScript configuration for all packages
  └── shrimp-rules.md   # AI Agent operational guidelines
  ```
- **MUST** place shared TypeScript interfaces, type definitions, and constants in `packages/shared/src/`.
- **MUST** keep MCP server code within `packages/mcp-server/src/`.
- **MUST** keep Electron audio capture code within `packages/electron-recorder/src/`.
- **NEVER** import Electron-specific modules (e.g., 'electron') in `packages/mcp-server/` code directly.
- **NEVER** import MCP server-specific modules from `packages/mcp-server/` into `packages/electron-recorder/` code directly, except for types from `packages/shared/`.

### 2.3. Package Management
- **MUST** use PNPM for all package management. (ADR-001)
- **MUST** use PNPM workspaces for monorepo structure. (ADR-001)
- **MUST** define a separate `package.json` for the root and for each package in the `packages/` directory (`mcp-server`, `electron-recorder`, `shared`).
- **MUST** include `@modelcontextprotocol/sdk` in `packages/mcp-server/package.json` dependencies. (ADR-001)
- **MUST** include `electron` in `packages/electron-recorder/package.json` dependencies. (ADR-001)

## 3. Code Standards

### 3.1. General
- **MUST** write clean, maintainable, and well-documented code.
- **MUST** use meaningful variable and function names.
- **MUST** ensure code is modular and reusable.
- **MUST** explain complex logic with comments.

### 3.2. TypeScript Configuration
- **MUST** use a base `tsconfig.base.json` in the root, extended by `tsconfig.json` in each package.
- **MUST** use strict TypeScript configuration with all strict flags enabled (e.g., `strict: true`).
- **MUST** target `ES2022` for Node.js code (`packages/mcp-server`, `packages/shared`).
- **MUST** target `ES2020` for Electron code (`packages/electron-recorder`).
- **MUST** enable `skipLibCheck: false` for maximum type safety.
- **MUST** use `moduleResolution: "node16"` or `"Bundler"` for modern Node.js compatibility.
- **Example `packages/mcp-server/tsconfig.json`:**
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src",
      "module": "NodeNext", // Or CommonJS if preferred for Node.js server
      "target": "ES2022"
    },
    "include": ["src/**/*"],
    "references": [{ "path": "../shared" }] // If it depends on shared
  }
  ```

## 4. Functionality Implementation Standards

### 4.1. MCP Server Tool Implementation
- **MUST** implement the following core MCP tools in `packages/mcp-server/`:
    - `startRecording`: Initiates audio capture.
    - `stopRecording`: Stops audio capture and saves the file.
    - `getStatus`: Checks the current recording state.
    - `checkMeeting`: Verifies if a Zoom meeting is active. (PRD User Story 1)
- **MUST** initially implement these tools as stubs returning simple text responses.

### 4.2. Meeting Detection (Zoom)
- **MUST** detect Zoom meetings using a hybrid approach: (ADR-005)
    1. Monitor for Zoom process existence.
    2. Analyze UDP connection count to determine active meeting state.
- **MUST** provide clear error messages like "❌ No active meeting found." if no meeting is detected. (PRD User Story 1)

### 4.3. Recording Workflow
- **MUST** support starting a recording, which begins audio capture. (PRD User Story 1)
- **MUST** support stopping a recording, which saves audio as a `.wav` file. (PRD User Story 2)
- **MUST** provide confirmation messages to the LLM client, including the full file path upon saving. (PRD User Story 2)

### 4.4. Concurrency
- **MUST** support only one active recording session at a time. (ADR-006, PRD Scalability)
- **MUST** return an error message like "A recording is already in progress. Please stop the current one before starting a new one." if a new recording is attempted while one is active. (ADR-006, PRD Scalability)

### 4.5. File Naming and Storage
- **MUST** save audio files as unencrypted `.wav` files. (ADR-004)
- **MUST** default to `~/.cardioid_recordings` for saving files. (ADR-004)
- **MUST** allow overriding the save directory via the `CARDIOID_OUTPUT_DIRECTORY` environment variable. (ADR-004, PRD User Story 2)
- **MUST** support custom filenames provided in the `stopRecording` request. (PRD User Story 2)
- **MUST** use a default timestamped name like `Cardioid-Recording-YYYY-MM-DD-HHMMSS.wav` if no custom name is provided. (PRD User Story 2, ADR-004)
- **MUST** set file permissions to `user=rw, group=r`. (ADR-004, PRD Security)

## 5. Framework/Plugin/Third-party Library Usage Standards

### 5.1. @modelcontextprotocol/sdk
- **MUST** use `@modelcontextprotocol/sdk` for MCP server implementation in `packages/mcp-server/`. (ADR-001)
- **MUST** use the `Server` class from the SDK to define and handle MCP tools.

### 5.2. Electron
- **MUST** use Electron for system-level audio API access in `packages/electron-recorder/`. (ADR-001)
- **MUST** run Electron in headless mode. (ADR-001)
- **MUST** manage the Electron process lifecycle (start, stop, monitor) from the `ElectronBridge` class in `packages/mcp-server/`.

## 6. Workflow Standards

### 6.1. Core Recording User Flow (from PRD 5.1)
- **MUST** adhere to the following sequence for successful recording:
    1. User prompts LLM Client to start recording (e.g., "Record the Zoom meeting").
    2. LLM Client sends `startRecording` request to Cardioid Server (MCP Server).
    3. Cardioid Server verifies Zoom is active, starts audio capture (via Electron process), and acknowledges to LLM Client.
    4. LLM Client informs User: "The Zoom meeting is now being recorded...".
    5. (Meeting takes place)
    6. User prompts LLM Client to stop recording (e.g., "Stop recording and save as 'Kickoff'").
    7. LLM Client sends `stopRecording` request to Cardioid Server (with filename).
    8. Cardioid Server stops audio capture, saves `.wav` file, and confirms to LLM Client with the full file path.
    9. LLM Client informs User: "The recording was saved to /path/to/Kickoff.wav".

## 7. Key File Interaction Standards

### 7.1. Shared Package (`packages/shared/`)
- **IF** any interfaces, type definitions, or constants in `packages/shared/src/` are modified:
    - **THEN** **MUST** check and update implementations in both `packages/mcp-server/src/` and `packages/electron-recorder/src/` that consume them.
    - **Example**: If `IPCMessageType` in `packages/shared/src/ipc-types.ts` is changed, update all message handlers and senders.

### 7.2. IPC Communication (`ElectronBridge` and Electron main process)
- **IF** the JSON-RPC message structure or commands defined for IPC (ADR-003) are changed:
    - **THEN** **MUST** update the `ElectronBridge` class in `packages/mcp-server/` (sender).
    - **AND THEN** **MUST** update the corresponding message handling logic in `packages/electron-recorder/` (receiver).

### 7.3. Documentation
- **IF** any user-facing functionality, configuration options, or architectural decisions change:
    - **THEN** **MUST** update `docs/PRD.md` and `docs/ADR.md` accordingly.
- **IF** `shrimp-rules.md` (this file) becomes outdated due to project changes:
    - **THEN** **MUST** update `shrimp-rules.md` to reflect the current state.

## 8. AI Decision-making Standards

### 8.1. Error Handling (ADR-008)
- **MUST** implement comprehensive error handling.
- **MUST** propagate user-friendly messages to LLM clients.
- **MUST** log detailed errors for developers.
- **MUST** fail fast to prevent inconsistent states.
- **Key Error Categories & Messages:**
    - Meeting Detection: "❌ No active meeting found."
    - Recording State: "A recording is already in progress. Please stop the current one before starting a new one."
    - File System: Provide detailed failure reasons with paths.
    - Hardware: Report audio device access issues.

### 8.2. Performance Constraints (ADR-009)
- **MUST** design all components to meet strict performance targets:
    - CPU Usage: <5% during active recording.
    - Memory Usage: <1GB total footprint.
    - Recording Latency: <5 seconds to start.
    - Session Duration: Support up to 2 hours continuous recording.
- **Implementation Strategies for Performance:**
    - Use efficient audio buffer management.
    - Minimize background processing.
    - Use lazy initialization for heavy components.
    - Implement regular memory cleanup if applicable.

### 8.3. Configuration Management (ADR-007)
- **MUST** use environment variables for all configuration.
- **MUST** provide sensible defaults for all options.
- **Supported Environment Variables:**
    - `CARDIOID_OUTPUT_DIRECTORY`: Default `~/.cardioid_recordings`.
    - `CARDIOID_LOG_LEVEL`: Options `debug`, `info`, `warn`, `error`. Default `info`.
- **MUST** validate environment variables at startup and fail fast on invalid configuration.

## 9. Prohibited Actions

### 9.1. Scope Limitations (PRD 7.3, ADRs)
- **NEVER** implement support for meeting platforms other than Zoom (initially).
- **NEVER** create a Graphical User Interface (GUI); the application must be headless.
- **NEVER** implement cloud storage integration; storage is local filesystem only (ADR-004).
- **NEVER** implement built-in audio transcription.
- **NEVER** design for multi-instance scaling or multi-tenant cloud services.
- **NEVER** combine MCP server and Electron audio capture into a single process (ADR-002).
- **NEVER** transmit audio files over any network (ADR-004).

### 9.2. Technology Choices
- **NEVER** use package managers other than PNPM.
- **NEVER** introduce alternative IPC mechanisms unless an ADR changes ADR-003.

### 9.3. File Operations
- **NEVER** overwrite existing recording files; append a suffix or use a unique name if a file with the target name exists.
- **NEVER** implement audio compression or format conversion beyond saving as `.wav`.

## 10. Development Workflow Principles

- **MUST** ensure the project is in a runnable state after each development iteration. This means all packages should build successfully and the primary application (MCP server) should be startable, even if some features are stubbed or incomplete.
- **MUST** prioritize keeping the main branch stable and deployable.
- **MUST** write tests for new features and bug fixes.

---
*This `shrimp-rules.md` file will be updated as development progresses and new decisions are made.*
