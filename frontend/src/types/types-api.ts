// frontend/src/types/api.ts
// Type definitions for EDx-App-V2 API

export interface Device {
  serial_number: string;
  com_port: string;
  status?: 'connected' | 'connecting' | 'idle' | 'running' | 'error' | 'disconnected';
}

export interface ScannedDevice {
  serial_number: string;
  com_port: string;
}

export interface ConnectedDevice {
  serial_number: string;
  com_port: string;
  status?: string;
}

export interface CommandResponse {
  status: string;
  command: string;
  response: string[];
}

export interface ScriptUploadResponse {
  status: string;
  serial_number: string;
}

export interface ScriptRunResponse {
  status: string;
  serial_number: string;
}

export interface DisconnectResponse {
  status: string;
  serial_number: string;
}

export interface ConnectResponse {
  status: string;
  serial_number: string;
  com_port: string;
}

// WebSocket event types
export interface WebSocketMessage {
  type: 'script-position' | 'script-output' | 'script-status' | 'motor-status' | 'data-sample' | 'temperature' | 'log';
  serial_number: string;
  timestamp: number;
  raw: string;
  [key: string]: unknown;
}

export interface ScriptPositionEvent extends WebSocketMessage {
  type: 'script-position';
  line: number;
}

export interface ScriptOutputEvent extends WebSocketMessage {
  type: 'script-output';
  message: string;
}

export interface DataSampleEvent extends WebSocketMessage {
  type: 'data-sample';
  index: number;
  value: number;
}

export interface TemperatureEvent extends WebSocketMessage {
  type: 'temperature';
  sensor: string;
  value: number;
}