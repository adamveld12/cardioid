import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ElectronBridge } from "./electron-bridge";

describe("ElectronBridge Integration Tests", () => {
  let bridge: ElectronBridge;

  beforeAll(async () => {
    // Ensure any existing instance is disposed if tests are run multiple times or in watch mode
    // This might be an issue if the singleton instance isn't reset properly.
    // Consider adding a static reset method to ElectronBridge for testing if needed.
    try {
      ElectronBridge.getInstance().dispose();
    } catch (e) {
      // Ignore if no instance exists
    }
    bridge = ElectronBridge.getInstance();
    // Wait for the audio-engine to be ready before running tests.
    await bridge.whenReady();
  });

  afterAll(() => {
    bridge.dispose();
  });

  it("should send start-recording command and receive a response", async () => {
    const response = await bridge.startRecording({ application: "TestApp" });
    expect(response).toBe("Recording started (stub from audio-engine)");
  });

  it("should send stop-recording command and receive a response", async () => {
    const response = await bridge.stopRecording();
    expect(response).toBe("Recording stopped (stub from audio-engine)");
  });

  it("should send get-audio-devices command and receive a response", async () => {
    const response = await bridge.getAudioDevices();
    expect(response).toEqual({ devices: ["stub-device-1", "stub-device-2"] });
  });

  // Test for an unknown command
  it("should receive an error for an unknown command", async () => {
    try {
      await bridge.sendCommand("unknown-command");
    } catch (error: any) {
      expect(error).toBe("Unknown command: unknown-command");
    }
  });
});
