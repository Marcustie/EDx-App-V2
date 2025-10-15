const BASE_URL = 'http://localhost:8000';

export const api = {
  scanDevices: async (): Promise<any[]> => {
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

  getConnectedDevices: async (): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/devices/connected`);
    if (!response.ok) throw new Error('Failed to get connected devices');
    return response.json();
  },

  uploadScript: async (serial: string, script: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/devices/upload-script/${serial}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    if (!response.ok) throw new Error('Failed to upload script');
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

  sendCommand: async (serial: string, command: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/devices/command/${serial}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!response.ok) throw new Error('Failed to send command');
  },
};
