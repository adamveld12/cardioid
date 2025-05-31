# Cardioid MCP Server

Cardioid is a Model Context Protocol (MCP) server for recording meeting audio. It allows AI clients to control audio recording of meetings from applications like Zoom, Google Meet, Slack, and Microsoft Teams.

## Features

- Record audio from system and microphone
- Support for popular video conferencing software
- Save recordings as WAV files
- Get recording status and metadata
- Configurable recording length and output directory
- Runnable via npx

## Requirements

- Node.js 14 or higher
- Electron (automatically installed as a dependency)

## Installation

```bash
# Install globally
npm install -g cardioid

# Or run directly with npx
npx cardioid
```

## Configuration

Cardioid can be configured using environment variables:

- `CARDIOID_MAX_LENGTH`: Maximum recording length (default: "1h30m")
  - Format: "1h30m", "90m", "5400s"
- `CARDIOID_OUTPUT_DIRECTORY`: Directory for saving WAV files (default: system temp directory)
- `NODE_ENV`: Set to "development" for additional logging

## MCP Tools

Cardioid provides three MCP tools for AI clients:

### 1. `record`

Starts recording audio from the system and microphone.

**Parameters:**
- `application` (optional): Target application ("Zoom", "Google Meet", "Slack", "Teams")

**Response:**
```json
{
  "status": "RECORDING" | "ERROR",
  "meta": {
    "application": "Zoom" | "Google Meet" | "Slack" | "Teams" | "Screen"
  }
}
```

### 2. `stop`

Stops recording and saves the audio as a WAV file.

**Parameters:**
- `outputDirectory` (optional): Custom output directory for the WAV file

**Response:**
```json
{
  "path": "/path/to/recording.wav",
  "meta": {
    "elapsedTimeSeconds": 120,
    "application": "Zoom" | "Google Meet" | "Slack" | "Teams" | "Screen"
  }
}
```

### 3. `status`

Gets the current recording status.

**Response:**
```json
{
  "status": "RECORDING" | "IDLE" | "ERROR",
  "meta": {
    "elapsedTimeSeconds": 120,
    "application": "Zoom" | "Google Meet" | "Slack" | "Teams" | "Screen"
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT
