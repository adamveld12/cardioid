# TODO: MCP Server and Audio Engine IPC Integration Plan

This document outlines the steps to integrate the `mcp-server` with the `audio-engine` for IPC-based control of audio recording.

**Phase 1: Prepare `audio-engine` for IPC with `mcp-server`** - DONE

*   **Modify `audio-engine`'s main process file for robust IPC**:
    *   File: `/home/adam/projects/cardioid/packages/audio-engine/src/main.ts`
    *   Action:
        *   Remove the existing `ipcMain.on('start-recording', ...)` and `ipcMain.on('stop-recording', ...)` handlers.
        *   Implement a global `process.on('message', (message: any) => { ... });` handler.
        *   Inside this handler:
            *   Log received messages for debugging.
            *   Expect messages to have a `command` (e.g., 'start-recording', 'stop-recording'), optional `args`, and a `requestId`.
            *   Based on the `command`, perform the stubbed action (e.g., log "starting recording").
            *   Send a reply back to the `mcp-server` (the parent process) using `process.send({ requestId, payload: 'some result' })` or `process.send({ requestId, error: 'something went wrong' })`.

**Phase 2: Create an `ElectronBridge` in `mcp-server`** - DONE

This bridge will be responsible for managing the `audio-engine` lifecycle and communication.

*   **Create `ElectronBridge` file**: - DONE
    *   File: `/home/adam/projects/cardioid/packages/mcp-server/src/electron-bridge.ts`
*   **Implement the `ElectronBridge` class**: - DONE
    *   **Singleton Pattern**: Ensure only one instance manages the Electron process.
    *   **Spawning**:
        *   In its constructor or an `init` method, use `child_process.spawn` to start the `audio-engine`.
        *   Command: `pnpm run start` (updated from `npx electron .`)
        *   Options:
            *   `cwd`: Set to the absolute path of the `audio-engine` package.
            *   `stdio`: Configure as `['pipe', 'pipe', 'pipe', 'ipc']`.
    *   **Lifecycle Management**:
        *   Log `stdout` and `stderr` from the `audio-engine` process.
        *   Handle `close` and `error` events of the child process.
    *   **Communication**:
        *   Implement `public async sendCommand(command: string, args?: any): Promise<any>`.
            *   Generate unique `requestId`.
            *   Send `{ command, args, requestId }` via `this.electronProcess.send(...)`.
            *   Return a Promise resolving/rejecting based on reply matching `requestId`, handling timeouts.
        *   Provide specific methods like `async startRecording(params: any)` and `async stopRecording(params: any)` using `sendCommand`.
    *   **Cleanup**: Implement `dispose()` method to kill Electron process gracefully.

**Phase 3: Integrate `ElectronBridge` with `mcp-server` Tools** - IN PROGRESS

*   **Add Dependency**: - DONE
    *   In `/home/adam/projects/cardioid/packages/mcp-server/package.json`, add `audio-engine` as a dependency (e.g., `"@vdhsn/cardioid-audio-engine": "workspace:*"`).
*   **Initialize and Use `ElectronBridge` in `mcp-server`**: - DONE
    *   File: `/home/adam/projects/cardioid/packages/mcp-server/src/server/index.ts`.
    *   Action: Import `ElectronBridge`, create/get singleton, initialize it in constructor, and dispose it in `stop()`.
*   **Update MCP Tools**: - DONE
    *   File: `/home/adam/projects/cardioid/packages/mcp-server/src/tools/index.ts`.
    *   Action: Modify tool handlers to call `ElectronBridge` methods and return results. Stub handlers removed.

**Phase 4: Build & Execution Considerations (Primarily for `audio-engine`)**

*   Ensure `audio-engine`'s `package.json` `main` field points to the correct JS entry file for Electron (e.g., `dist/main.js` or `src/main.ts`). Currently `src/main.ts`.
*   Consider if `audio-engine` needs a build step to compile TypeScript to JavaScript if `electron .` or `pnpm run start` in `audio-engine` doesn't handle TS compilation implicitly.
