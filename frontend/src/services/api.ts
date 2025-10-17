import type { ScannedDevice, ConnectedDevice, CommandResponse } from '@/types/api';

const BASE_URL = 'http://localhost:8000';

export const api = {
  scanDevices: async (): Promise<ScannedDevice[]> => {
    const response = await fetch(`${BASE_URL}/devices/scan`);
    if (!response.ok) throw new Error('Failed to scan devices');
    return response.json();
  },

  connectDevice: async (comPort: string, serial: string): Promise<void> => {
    const response = await fetch(
      `${BASE_URL}/devices/connect?com_port=${comPort}&serial_number=${serial}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to connect device');
  },

  getConnectedDevices: async (): Promise<ConnectedDevice[]> => {
    const response = await fetch(`${BASE_URL}/devices/connected`);
    if (!response.ok) throw new Error('Failed to get connected devices');
    return response.json();
  },

  uploadScript: async (serial: string, script: string): Promise<{ status: string; serial_number: string; ready: boolean; lines: number; source: string }> => {
    const response = await fetch(`${BASE_URL}/devices/upload-script/${serial}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    if (!response.ok) throw new Error('Failed to upload script');
    return response.json();
  },

  runScript: async (serial: string, metadata: string = ''): Promise<void> => {
    const response = await fetch(
      `${BASE_URL}/devices/run-script/${serial}?metadata=${metadata}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to run script');
  },

  disconnectDevice: async (serial: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/devices/disconnect/${serial}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to disconnect device');
  },

  sendCommand: async (serial: string, command: string): Promise<CommandResponse> => {
    const encodedCommand = encodeURIComponent(command);
    const response = await fetch(
      `${BASE_URL}/devices/command/${serial}?command=${encodedCommand}&wait_for_response=true`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to send command');
    return response.json();
  },
};