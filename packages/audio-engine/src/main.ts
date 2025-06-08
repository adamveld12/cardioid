import { app, BrowserWindow } from "electron";

function createWindow() {
  // Create the browser window.
  // For a headless process, we don't actually need to create a window.
  // However, Electron requires a window to be created to keep the app running.
  // We can create a minimal, hidden window.
  const win = new BrowserWindow({
    width: 1,
    height: 1,
    show: false, // Hide the window
    webPreferences: {
      nodeIntegration: true, // Be cautious with this in production
      contextIsolation: false, // Be cautious with this in production
    },
  });

  // You can use the 'win' variable if needed, for example, to load a blank page
  // win.loadURL('about:blank');
  console.log(win); // Added to use the 'win' variable and resolve the linting error

  console.log("Electron process started with a hidden window.");

  // Send ready signal to parent process
  if (process.send) {
    process.send({
      type: "status",
      status: "ready",
      message: "Audio engine is ready.",
    });
    console.log("[audio-engine] Sent ready signal to parent.");
  } else {
    console.error(
      "[audio-engine] process.send not available. Cannot send ready signal."
    );
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow();
  // }
});

// Listen for messages from the parent process (mcp-server)
process.on("message", (message: any) => {
  console.log("[audio-engine] Received message from parent:", message);

  const { command, args, requestId } = message;

  if (!command || !requestId) {
    console.error(
      "[audio-engine] Invalid message received, missing command or requestId:",
      message
    );
    // Optionally send an error back if process.send is available and makes sense here
    if (process.send) {
      process.send({
        requestId,
        error: "Invalid message: command or requestId missing",
      });
    }
    return;
  }

  switch (command) {
    case "start-recording":
      // Stub: Add actual recording start logic here
      console.log(
        "[audio-engine] Executing start-recording command with args:",
        args
      );
      if (process.send) {
        process.send({
          requestId,
          payload: "Recording started (stub from audio-engine)",
        });
      }
      break;
    case "stop-recording":
      // Stub: Add actual recording stop logic here
      console.log(
        "[audio-engine] Executing stop-recording command with args:",
        args
      );
      if (process.send) {
        process.send({
          requestId,
          payload: "Recording stopped (stub from audio-engine)",
        });
      }
      break;
    case "get-audio-devices": // Added case
      // Stub: Add actual audio device fetching logic here
      console.log(
        "[audio-engine] Executing get-audio-devices command with args:",
        args
      );
      if (process.send) {
        process.send({
          requestId,
          payload: { devices: ["stub-device-1", "stub-device-2"] }, // Stubbed device list
        });
      }
      break;
    default:
      console.warn(`[audio-engine] Unknown command: ${command}`);
      if (process.send) {
        process.send({ requestId, error: `Unknown command: ${command}` });
      }
  }
});

console.log(
  "Electron main.ts loaded, IPC via process.on('message') is active."
);
