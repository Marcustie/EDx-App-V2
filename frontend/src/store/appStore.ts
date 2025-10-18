import { create } from 'zustand';

export interface MetaTag {
  key: string;
  value: string;
}

export interface DeviceState {
  uploadedScript: string;
  uploadedScriptReady: boolean;
  currentLine: number;
  isRunning: boolean;
  captureActive: boolean;
  metadataTags: MetaTag[];
  showInChart: boolean;
  rtiaChannel?: 'A' | 'B' | 'C';
}

interface AppState {
  scanInProgress: boolean;
  connectedDevices: string[];
  perDevice: Record<string, DeviceState>;
  activeTab: string | null;
  
  // Actions
  setScanInProgress: (scanning: boolean) => void;
  addDevice: (serial: string) => void;
  removeDevice: (serial: string) => void;
  setDevices: (devices: string[]) => void;
  setActiveTab: (serial: string | null) => void;
  
  // Device-specific actions
  setUploadedScript: (serial: string, script: string) => void;
  setScriptReady: (serial: string, ready: boolean) => void;
  setCurrentLine: (serial: string, line: number) => void;
  setIsRunning: (serial: string, running: boolean) => void;
  setCaptureActive: (serial: string, active: boolean) => void;
  setMetadataTags: (serial: string, tags: MetaTag[]) => void;
  setShowInChart: (serial: string, show: boolean) => void;
  setRtiaChannel: (serial: string, channel: 'A' | 'B' | 'C') => void;
  
  // Clear device state
  clearDeviceState: (serial: string) => void;
}

const defaultDeviceState: DeviceState = {
  uploadedScript: '',
  uploadedScriptReady: false,
  currentLine: 0,
  isRunning: false,
  captureActive: false,
  metadataTags: [],
  showInChart: true,
  rtiaChannel: 'A',
};

export const useAppStore = create<AppState>((set) => ({
  scanInProgress: false,
  connectedDevices: [],
  perDevice: {},
  activeTab: null,

  setScanInProgress: (scanning) => set({ scanInProgress: scanning }),
  
  addDevice: (serial) =>
    set((state) => {
      if (state.connectedDevices.includes(serial)) return state;
      return {
        connectedDevices: [...state.connectedDevices, serial],
        perDevice: {
          ...state.perDevice,
          [serial]: state.perDevice[serial] || { ...defaultDeviceState },
        },
        activeTab: state.activeTab || serial,
      };
    }),
  
  removeDevice: (serial) =>
    set((state) => {
      const newDevices = state.connectedDevices.filter((s) => s !== serial);
      const { [serial]: removed, ...newPerDevice } = state.perDevice;
      return {
        connectedDevices: newDevices,
        perDevice: newPerDevice,
        activeTab: state.activeTab === serial ? newDevices[0] || null : state.activeTab,
      };
    }),
  
  setDevices: (devices) =>
    set((state) => {
      const newPerDevice = { ...state.perDevice };
      devices.forEach((serial) => {
        if (!newPerDevice[serial]) {
          newPerDevice[serial] = { ...defaultDeviceState };
        }
      });
      return {
        connectedDevices: devices,
        perDevice: newPerDevice,
        activeTab: state.activeTab && devices.includes(state.activeTab)
          ? state.activeTab
          : devices[0] || null,
      };
    }),
  
  setActiveTab: (serial) => set({ activeTab: serial }),
  
  setUploadedScript: (serial, script) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          uploadedScript: script,
        },
      },
    })),
  
  setScriptReady: (serial, ready) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          uploadedScriptReady: ready,
        },
      },
    })),
  
  setCurrentLine: (serial, line) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          currentLine: line,
        },
      },
    })),
  
  setIsRunning: (serial, running) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          isRunning: running,
        },
      },
    })),
  
  setCaptureActive: (serial, active) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          captureActive: active,
        },
      },
    })),
  
  setMetadataTags: (serial, tags) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          metadataTags: tags,
        },
      },
    })),
  
  setShowInChart: (serial, show) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          showInChart: show,
        },
      },
    })),
  
  setRtiaChannel: (serial, channel) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: {
          ...(state.perDevice[serial] || defaultDeviceState),
          rtiaChannel: channel,
        },
      },
    })),
  
  clearDeviceState: (serial) =>
    set((state) => ({
      perDevice: {
        ...state.perDevice,
        [serial]: { ...defaultDeviceState },
      },
    })),
}));
