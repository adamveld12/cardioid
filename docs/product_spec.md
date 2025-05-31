# Audio Recording MCP Server: Product Design Document

This document describes the Feature requirements of this application named *Cardioid*, a Meeting recorder MCP Server.

It outlines the product features and requirements.


## Technical Requirements

1. Must be a well behaved and compliant Model Context Protocol server.
	- Implement the model context protocol correctly and precisely.
		- use STDIO out
	- Must be able to safely record 2 hours of audio in one session
	- Must not use excessive amounts of memory or CPU while recording

2. Must be a NodeJS, Typescript based Tech Stack
	- *NodeJS*, *Typescript*, *PNPM*
	- *Electron*
	- Must use *@modelcontextprotocol/sdk* to implement the Model Context Protocol. https://github.com/modelcontextprotocol/typescript-sdk

3. Must support multiple operating systems
	- Just Windows, macOS for now.

4. Must be able to record meeting audio for popular video conferencing software
	- Zoom
	- Google Meet
	- Slack
	- Teams

5. Must save audio in simple, widely accessible audio formats
	- Support .wav for now

## Feature Requirements

1. Must be able to record audio from the system and the User's microphone.
	- There should be a tool available to the LLM client named `record` to perform this action
	- In response this action should
		- start recording audio
		- The max length of the audio should be configurable through an environment variable
			- `CARDIOID_MAX_LENGTH`: the maximum length of the recording in seconds. Defaults to `1h30m`
	- If a recording reaches the max length, automatically stop recording.

2. Must be able to stop the audio recording.
	- There should be a tool available to the LLM client named `stop` to perform this action
	- In response this action should
		- write the audio to a temporary directory as a .WAV file
		- return the URL to the file
	- The output directory should be configurable through an environment variable
		- `CARDIOID_OUTPUT_DIRECTORY`: where the recording WAV files will be written. Default the the temp directory for the current system

3. Must be able to determine the current recording status
	- There should be a tool available to the LLM client named `status` to perform this action
	- In response this action should reply with
		- recording status: if we are currently recording audio from the system or not
		- recording length in seconds: if we are recording, how long the recording is currently

4. Must be configurable.
	- Provide configuration through environment variables only
	- `max_length`: the maximum length of the recording in seconds. Defaults to `1h30m`


5. Must be easy to install on a variety of MCP Server Clients
	- VSCode with Copilot chat, Cline
	- Cursor
	- Windsurf
	- Zed
	- Goose
	- Claude Desktop

6. Should be runnable with NPX
