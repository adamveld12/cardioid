# Architectural Decision Record (ADR): Cardioid

**Author:** Adam Veldhousen
**Date:** June 7, 2025
**Status:** Accepted

## Context

Cardioid is a Model Context Protocol (MCP) server designed to enable seamless meeting recording directly from LLM clients. The application must capture system audio from Zoom meetings while maintaining strict performance constraints and providing a headless, local-only operation.

## Key Architectural Decisions

### ADR-001: Technology Stack Selection

**Decision:** Use Node.js + TypeScript + PNPM + Electron + @modelcontextprotocol/sdk

**Rationale:**
- **Node.js + TypeScript**: Provides strong typing, excellent ecosystem for server development, and aligns with MCP SDK requirements
- **PNPM**: Efficient package management with faster installs and better disk space usage
- **Electron**: Required for system-level audio API access on multiple platforms; headless mode eliminates GUI overhead
- **@modelcontextprotocol/sdk**: Official SDK ensures compatibility and future-proofing with MCP ecosystem

**Consequences:**
- Slightly larger memory footprint due to Electron, but necessary for audio capture
- Strong type safety reduces runtime errors
- Excellent tooling and debugging experience

### ADR-002: Process Architecture - Dual Process Design

**Decision:** Implement separate Node.js (MCP Server) and Electron (Audio Capture) processes communicating via IPC

**Rationale:**
- **Separation of Concerns**: MCP protocol handling isolated from system audio operations
- **Failure Isolation**: Audio capture issues don't crash the MCP server and vice versa
- **Security**: Minimal privilege escalation - only Electron process needs audio permissions
- **Performance**: Main MCP server remains lightweight while Electron handles heavy audio operations

**Consequences:**
- Increased complexity in IPC management
- Better fault tolerance and debugging
- Clear architectural boundaries

### ADR-003: Communication Protocol - JSON-RPC over IPC

**Decision:** Use structured JSON-RPC messages over Node.js IPC for Electron bridge communication

**Rationale:**
- **Standardization**: JSON-RPC provides clear request/response patterns
- **Error Handling**: Built-in error propagation mechanisms
- **Debugging**: Human-readable message format
- **Async Support**: Natural Promise-based workflow

**Implementation Pattern:**
```
MCP Server → ElectronBridge.sendCommand() → IPC Message → Electron Main Process
                                          ←             ←
```

### ADR-004: Audio Storage Strategy - Local Filesystem Only

**Decision:** Store all audio files as unencrypted WAV files on local filesystem

**Rationale:**
- **Security**: No network transmission eliminates data leakage risks
- **Performance**: Direct file I/O is fastest and most reliable
- **Simplicity**: No cloud integration complexity or authentication requirements
- **User Control**: Users maintain complete ownership of their data

**File Organization:**
- Default directory: `~/.cardioid_recordings`
- Configurable via `CARDIOID_OUTPUT_DIRECTORY` environment variable
- Filename patterns: Custom names or `Cardioid-Recording-YYYY-MM-DD-HHMMSS.wav`
- File permissions: `user=rw, group=r`

### ADR-005: Meeting Detection Strategy - Process-Based Detection

**Decision:** Detect Zoom meetings by monitoring running processes rather than API integration

**Rationale:**
- **Simplicity**: No OAuth or API key management required
- **Reliability**: Works across all Zoom versions and configurations
- **Privacy**: No external API calls or data sharing
- **Performance**: Lightweight process monitoring vs. continuous API polling

**Implementation:**
- Monitor for Zoom process existence
- Validate audio device access when recording starts
- Fail gracefully with clear error messages

### ADR-006: Concurrency Model - Single Recording Session

**Decision:** Support only one active recording session at a time

**Rationale:**
- **Resource Management**: Prevents audio device conflicts and memory bloat
- **User Experience**: Clear, predictable behavior - no confusion about which meeting is being recorded
- **Performance**: Ensures consistent quality and meets <5% CPU usage requirement
- **Simplicity**: Eliminates complex session management logic

**Error Handling:**
- Clear error message when attempting concurrent recordings
- Automatic cleanup of orphaned sessions on restart

### ADR-007: Configuration Management - Environment Variables Only

**Decision:** Use environment variables for all configuration, with sensible defaults

**Rationale:**
- **12-Factor App Compliance**: Enables easy deployment and testing
- **Security**: No sensitive data in configuration files
- **Simplicity**: No config file parsing or validation complexity
- **Deployment**: Works seamlessly with containers and CI/CD

**Configuration Options:**
- `CARDIOID_OUTPUT_DIRECTORY`: Recording save location
- `CARDIOID_LOG_LEVEL`: Logging verbosity
- All optional with working defaults

### ADR-008: Error Handling Strategy - Fail Fast with Clear Messages

**Decision:** Implement comprehensive error handling with user-friendly messages propagated to LLM clients

**Rationale:**
- **User Experience**: Clear, actionable error messages improve usability
- **Debugging**: Detailed logs for developers, simple messages for users
- **Reliability**: Fail fast prevents inconsistent states

**Error Categories:**
- Meeting Detection Errors: "No active meeting found"
- Recording State Errors: "Recording already in progress"
- File System Errors: Detailed failure reasons with paths
- Hardware Errors: Audio device access issues

### ADR-009: Performance Constraints - Resource-Limited Design

**Decision:** Design all components to meet strict performance requirements

**Performance Targets:**
- **CPU Usage**: <5% during active recording
- **Memory Usage**: <1GB total footprint
- **Recording Latency**: <5 seconds to start
- **Session Duration**: Support up to 2 hours continuous recording

**Implementation Strategies:**
- Efficient audio buffer management
- Minimal background processing
- Lazy initialization of heavy components
- Regular memory cleanup

### ADR-010: Distribution Strategy - NPM Package with npx Execution

**Decision:** Distribute as NPM package executable via `npx cardioid`

**Rationale:**
- **Accessibility**: Easy installation without global package management
- **Version Management**: Users always get latest version with npx
- **Cross-Platform**: NPM works consistently across operating systems
- **Developer Experience**: Familiar workflow for target audience

**Package Structure:**
- Main executable script
- Bundled dependencies
- Clear installation documentation

## Decision Matrix Summary

| Aspect | Decision | Alternative Considered | Rationale |
|--------|----------|----------------------|-----------|
| Architecture | Dual Process (Node.js + Electron) | Single Process | Separation of concerns, security |
| Communication | JSON-RPC over IPC | REST API, WebSockets | Simplicity, local-only operation |
| Storage | Local filesystem | Cloud storage, Database | Security, performance, user control |
| Meeting Detection | Process monitoring | Zoom API integration | Simplicity, privacy, reliability |
| Concurrency | Single session | Multiple sessions | Resource management, user clarity |
| Configuration | Environment variables | Config files, CLI args | 12-factor compliance, simplicity |
| Distribution | NPM + npx | Standalone binaries | Developer familiarity, easy updates |

## Future Architecture Considerations

### Extensibility Points
- **Meeting Platform Support**: Plugin architecture for adding Google Meet, Teams
- **Storage Backends**: Pluggable storage for cloud integration
- **Audio Processing**: Hooks for transcription and analysis
- **Configuration**: Potential config file support for advanced users

### Scalability Constraints
- Current architecture explicitly designed for single-user, local-only operation
- Multi-tenant or cloud deployment would require significant architectural changes
- Resource constraints prevent multiple concurrent recording sessions

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Electron security vulnerabilities | Medium | Regular updates, minimal attack surface |
| Audio driver compatibility issues | High | Comprehensive testing, clear error messages |
| Meeting platform API changes | Low | Process-based detection independent of APIs |
| IPC communication failures | Medium | Robust error handling, automatic retry logic |

---

*This ADR will be updated as architectural decisions evolve during development.*
