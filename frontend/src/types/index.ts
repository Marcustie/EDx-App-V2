export interface Device {
  serial_number: string;
  com_port: string;
}

export interface ConnectedDevice extends Device {
  status: 'connected' | 'idle' | 'running' | 'error';
}

export interface DataPoint {
  index: number;
  value: number;
}

export type WebSocketEvent =
  | { type: 'script-position'; line: number }
  | { type: 'script-output'; message: string }
  | { type: 'data-sample'; index: number; value: number }
  | { type: 'temperature'; sensor: string; value: number }
  | { type: 'motor-status'; message: string }
  | { type: 'script-status'; message: string }
  | { type: 'log'; message: string };

export interface ScriptData {
  id: string;
  name: string;
  content: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}
