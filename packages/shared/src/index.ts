/**
 * Recording status enumeration
 */
export enum RecordingStatus {
  IDLE = "IDLE",
  RECORDING = "RECORDING",
  ERROR = "ERROR",
}

/**
 * Supported meeting applications
 */
export enum MeetingApplication {
  ZOOM = "Zoom",
  GOOGLE_MEET = "Google Meet",
  SLACK = "Slack",
  TEAMS = "Teams",
  SYSTEM = "System",
}

/**
 * IPC message types for communication between MCP server and Electron recorder
 */
export enum IPCMessageType {
  START_RECORDING = "START_RECORDING",
  STOP_RECORDING = "STOP_RECORDING",
  GET_STATUS = "GET_STATUS",
  CHECK_MEETING = "CHECK_MEETING",
  RECORDING_STARTED = "RECORDING_STARTED",
  RECORDING_STOPPED = "RECORDING_STOPPED",
  STATUS_RESPONSE = "STATUS_RESPONSE",
  MEETING_STATUS = "MEETING_STATUS",
  ERROR = "ERROR",
}

/**
 * Base IPC message interface
 */
export interface IPCMessage {
  id: string;
  type: IPCMessageType;
  timestamp: number;
}

/**
 * Request to start recording
 */
export interface StartRecordingRequest extends IPCMessage {
  type: IPCMessageType.START_RECORDING;
  payload: {
    application?: MeetingApplication;
    maxDuration?: number; // seconds
  };
}

/**
 * Request to stop recording
 */
export interface StopRecordingRequest extends IPCMessage {
  type: IPCMessageType.STOP_RECORDING;
  payload: {
    filename?: string;
    outputDirectory?: string;
  };
}

/**
 * Response when recording starts
 */
export interface RecordingStartedResponse extends IPCMessage {
  type: IPCMessageType.RECORDING_STARTED;
  payload: {
    status: RecordingStatus.RECORDING;
    application: MeetingApplication;
    startTime: number;
  };
}

/**
 * Response when recording stops
 */
export interface RecordingStoppedResponse extends IPCMessage {
  type: IPCMessageType.RECORDING_STOPPED;
  payload: {
    status: RecordingStatus.IDLE;
    filePath: string;
    duration: number; // seconds
    application: MeetingApplication;
  };
}

/**
 * Status response
 */
export interface StatusResponse extends IPCMessage {
  type: IPCMessageType.STATUS_RESPONSE;
  payload: {
    status: RecordingStatus;
    duration?: number; // seconds, if recording
    application?: MeetingApplication;
    startTime?: number;
  };
}

/**
 * Meeting status response
 */
export interface MeetingStatusResponse extends IPCMessage {
  type: IPCMessageType.MEETING_STATUS;
  payload: {
    hasActiveMeeting: boolean;
    application?: MeetingApplication;
    confidence?: number; // 0-1 confidence score
  };
}

/**
 * Error response
 */
export interface ErrorResponse extends IPCMessage {
  type: IPCMessageType.ERROR;
  payload: {
    error: string;
    code?: string;
    details?: any;
  };
}

/**
 * Union type for all IPC messages
 */
export type IPCMessageUnion =
  | StartRecordingRequest
  | StopRecordingRequest
  | RecordingStartedResponse
  | RecordingStoppedResponse
  | StatusResponse
  | MeetingStatusResponse
  | ErrorResponse;
