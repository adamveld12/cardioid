# Audio Recording MCP Server: Conceptual Design

I approached the design of this Model Context Protocol (MCP) server methodically:

I separated concerns between protocol handling, audio capture, and command implementation to allow for easier maintenance and testing of individual components.

## 1. Core Architecture Components
	- *MCP Server*: Handles the protocol communication.
	- *Recording Engine*: Manages audio capture through Electron APIs
	- *Command Handlers*: Implements the three required functions

### *MCP Server*

- Uses *@modelcontextprotocol/sdk*: SDK that implements the Model Context Protocol. https://github.com/modelcontextprotocol/typescript-sdk
	- Should support STDIO transport
	- This package should work with NPX

### *Recording Engine*

Manages the *Electron* app. *Electron* provides window management and media capture capabilities

- Window Management Requirements:
	- Need a minimal or hidden window for background operation
	- Must maintain process even when not in focus
	- Should handle proper application lifecycle events
		- For example, MCP server stop/starts

- Media Capture Specifics:
	- Use `desktopCapturer` API to access system audio streams
	- Need permissions management for accessing audio devices
	- Must handle both microphone and system audio capture options
	- Need to support common audio formats and sampling rates

- Cross-Platform Considerations:
	- Audio APIs differ between Windows, macOS, and Linux
	- File path handling must be OS-appropriate
	- Temporary directory access differs by platform



### *Command Handlers*

Implement the tools that the MCP Server will export. The following are the handlers:

- *record_meeting*: Initializes audio capture of the meeting via Electron's media APIs.
	- Can specify an application (IE Zoom, Chrome, Slack)
	- If no application is specified, open a "screen share" picker using electron
	- Returns
		```json
		{
			"status": "RECORDING" | "ERROR",
			"meta": {
				"application": "Zoom" | "Slack" | "Chrome"
			}
		}
		```

- *finish_recording*: Stops capture, writes a WAV file to a temporary directory, returns path
	- Can specify where you would like to save the recording
	- Returns
		```json
		{
			"path": "/some/path/audio.wav",
			"meta": {
				"elapsedTimeSeconds": 0,
				"application": "Zoom" | "Slack" | "Chrome"
			}
		}
		```

- *recording_status*: Returns current recording state. If we are recording or not, how long the recording has been going
	- Returns if you are actively recording or not.
	- Returns
		```json
		{
			"status": "RECORDING" | "IDLE",
			"meta": {
				"elapsedTimeSeconds": 0,
				"application": "Zoom" | "Slack" | "Chrome"
			}
		}
		```


### 3. Release Considerations

This MCP server should:

- Should be executable via npx
- Support all major AI IDEs
	- VSCode (Copilot, Cline)
	- Windsurf
	- Cursor
	- Zed

