import { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataChart } from '@/components/DataChart';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/services/api';
import type { DataPoint } from '@/types';
import {
  Play,
  Square,
  Thermometer,
  Activity,
  ArrowLeft,
  Wifi,
  WifiOff,
  Terminal,
  Trash2,
} from 'lucide-react';

/* ----------------------------- helpers/types ----------------------------- */

function isTransportNoise(msg: string): boolean {
  if (!msg) return false;
  const s = msg.trim();
  // Keep only the console heartbeat filter; DO NOT hide gpbuf/buffer lines so we can capture upload/decoded output.
  if (/^\d+\.\d+\s+console\s+I\s+@0$/.test(s)) return true;
  return false;
}

const MAX_DATA_POINTS = 1000;
const MAX_OUTPUT_LINES = 500; // retained for internal buffer; panel removed
const MAX_TERMINAL_HISTORY = 100;
const MAX_COMMAND_HISTORY = 50;

interface TerminalEntry {
  id: number;
  timestamp: Date;
  command: string;
  response: string[];
  pending?: boolean;
}

interface Device {
  serial_number: string;
  com_port: string;
  status?: string;
}

/** WebSocket events (discriminated union, no `any`) */
type WsEvent =
  | { type: 'data-sample'; index: number; value: number }
  | { type: 'script-position'; line: number }
  | { type: 'script-output'; message?: string }
  | { type: 'log'; message?: string }
  | {
      type: 'script-uploaded';
      script?: string;
      lines?: number;
      ready?: boolean;
      timestamp?: number;
    }
  | { type: 'temperature'; sensor: 'ir1' | 'ir2'; value: number };

/** Hook return typing (keeps local file lint-clean without changing the hook) */
interface UseWebSocketReturn {
  events: WsEvent[];
  isConnected: boolean;
  clearEvents: () => void;
}

/* -------------------------------- component ------------------------------ */

export function DeviceDetail() {
  const [, params] = useRoute<{ serial: string }>('/instruments/:serial');
  const [, navigate] = useLocation();
  const serialNumber = params?.serial || '';

  const [device, setDevice] = useState<Device | null>(null);

  // Script & UI state
  const [uploadedScript, setUploadedScript] = useState<string>('');
  const [scriptReady, setScriptReady] = useState(false);
  const [justBecameReady, setJustBecameReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [currentLine, setCurrentLine] = useState<number | undefined>();
  const [temperature, setTemperature] = useState<{ ir1: number; ir2: number }>({ ir1: 0, ir2: 0 });
  const [activeTab, setActiveTab] = useState<'control' | 'info'>('control');

  // Terminal state
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs
  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const scriptViewerRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const lastScriptRef = useRef<string>('');
  const processedCountRef = useRef<number>(0);

  // Buffer and capture window for decoded-script fallback

  const outputRef = useRef<string[]>([]); // keep output even though we removed the panel (useful for debugging)

  const { events, isConnected, clearEvents } = useWebSocket(serialNumber) as UseWebSocketReturn;

  /* ------------------------------ initial load ------------------------------ */

  useEffect(() => {
    loadDevice();

    // Reset page state on device change
    setUploadedScript('');
    lastScriptRef.current = '';
    setScriptReady(false);
    setIsRunning(false);
    setCurrentLine(undefined);
    outputRef.current = [];
    setDataPoints([]);
  }, [serialNumber]);

  /* ----------------------------- scroll behaviors ---------------------------- */

  // Auto-scroll terminal output
  useEffect(() => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
    }
  }, [terminalEntries]);

  // Auto-scroll script viewer to current line
  useEffect(() => {
    if (scriptViewerRef.current && currentLine !== undefined) {
      const lineElement = scriptViewerRef.current.querySelector<HTMLElement>(`[data-line="${currentLine}"]`);
      lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLine]);

  /* ------------------------------- event pump ------------------------------- */

  useEffect(() => {
    const newEvents = events.slice(processedCountRef.current);

    newEvents.forEach((event) => {
      switch (event.type) {
        case 'data-sample': {
          const { index, value } = event;
          setDataPoints((prev) => {
            const updated = [...prev, { index, value }];
            return updated.length > MAX_DATA_POINTS ? updated.slice(-MAX_DATA_POINTS) : updated;
          });
          break;
        }

        case 'script-position': {
          setCurrentLine(event.line);
          localStorage.setItem(`current-line-${serialNumber}`, String(event.line));
          break;
        }

        case 'script-output':
        case 'log': {
          const msg = (event.message ?? '').trim();
          if (isTransportNoise(msg)) break;

          // Keep rolling output buffer for debugging
          const updated = [...outputRef.current, msg];
          outputRef.current = updated.length > MAX_OUTPUT_LINES ? updated.slice(-MAX_OUTPUT_LINES) : updated;
          break;
        }

        case 'script-uploaded': {
          const incomingScript: string = event.script ?? '';
          const incomingLines: number =
            typeof event.lines === 'number'
              ? event.lines
              : incomingScript
              ? incomingScript.split('\n').length
              : 0;
          const incomingReady: boolean = event.ready === true || incomingLines >= 5; // fallback rule

          if (incomingScript) {
            setUploadedScript(incomingScript);
            localStorage.setItem(`uploaded-script-${serialNumber}`, incomingScript);
          }

          localStorage.setItem(`uploaded-script-lines-${serialNumber}`, String(incomingLines));
          localStorage.setItem(`uploaded-script-ready-${serialNumber}`, String(!!incomingReady));

          lastScriptRef.current = incomingScript;

          if (incomingReady) {
            setScriptReady(true);
            setJustBecameReady(true);
            window.setTimeout(() => setJustBecameReady(false), 1500);
            // mark not running until START pressed
          }
          break;
        }

        case 'temperature': {
          const { sensor, value } = event;
          setTemperature((prev) => ({ ...prev, [sensor]: value }));
          break;
        }
      }
    });

    processedCountRef.current = events.length;

    // prevent unbounded growth
    if (events.length > 500) {
      clearEvents();
      processedCountRef.current = 0;
    }
  }, [events, clearEvents, activeTab, serialNumber, scriptReady]);

  /* --------------------------------- actions -------------------------------- */

  const loadDevice = async () => {
    try {
      const devices = await api.getConnectedDevices();
      const found = devices.find((d: Device) => d.serial_number === serialNumber) || null;
      setDevice(found);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load device:', error);
    }
  };

  const handleRunScript = async () => {
    try {
      setDataPoints([]);
      setCurrentLine(undefined);
      outputRef.current = [];
      await api.runScript(serialNumber);
      setIsRunning(true);
      localStorage.setItem(`is-running-${serialNumber}`, 'true');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to run script:', error);
    }
  };

  const handleStopScript = async () => {
    try {
      // Try the dedicated stop endpoint first
      await api.stopScript(serialNumber);
    } catch (e) {
      // If that fails, fall back to sending Ctrl+C (ETX)
      try {
        await api.sendCommand(serialNumber, '\u0003'); // Ctrl+C
      } catch {
        // ignore, we tried
      }
    } finally {
      setIsRunning(false);
      localStorage.setItem(`is-running-${serialNumber}`, 'false');
      setCurrentLine(undefined);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectDevice(serialNumber);
      navigate('/instruments');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect device:', error);
    }
  };

  const handleSendCommand = async () => {
    if (!terminalInput.trim()) return;

    const command = terminalInput.trim();
    const entryId = entryIdRef.current++;

    // Add to command history
    setCommandHistory((prev) => {
      const updated = [...prev, command];
      return updated.length > MAX_COMMAND_HISTORY ? updated.slice(-MAX_COMMAND_HISTORY) : updated;
    });
    setHistoryIndex(-1);

    // Add pending entry
    setTerminalEntries((prev) => {
      const updated: TerminalEntry[] = [
        ...prev,
        {
          id: entryId,
          timestamp: new Date(),
          command,
          response: [],
          pending: true,
        },
      ];
      return updated.length > MAX_TERMINAL_HISTORY ? updated.slice(-MAX_TERMINAL_HISTORY) : updated;
    });

    setTerminalInput('');

    try {
      const result = await api.sendCommand(serialNumber, command);
      setTerminalEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, response: (result.response as string[]) ?? [], pending: false } : entry,
        ),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send command:', error);
      setTerminalEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, response: ['✗ Command failed'], pending: false } : entry,
        ),
      );
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSendCommand();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setTerminalInput(commandHistory[newIndex]);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setTerminalInput('');
      } else {
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[newIndex]);
      }
    }
  };

  const handleClearTerminal = () => {
    setTerminalEntries([]);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /* -------------------------------- rendering -------------------------------- */

  if (!device) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading device...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/instruments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{serialNumber}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{device.com_port}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? 'default' : 'outline'} className="gap-1.5">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5" /> WebSocket Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" /> Disconnected
              </>
            )}
          </Badge>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect Device
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'control' | 'info')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        {/* Control Tab - 2 Column Layout */}
        <TabsContent value="control" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Controls + Script */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleRunScript}
                      size="lg"
                      disabled={!scriptReady || isRunning}
                      className={`${
                        scriptReady && !isRunning
                          ? justBecameReady
                            ? 'ring-2 ring-green-500 animate-pulse'
                            : ''
                          : 'opacity-50 cursor-not-allowed'
                      } ${isRunning ? 'bg-green-600 animate-pulse' : 'bg-[hsl(var(--status-online))]'} hover:bg-[hsl(var(--status-online))]/90`}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      {isRunning ? 'RUNNING' : 'START'}
                    </Button>
                    <Button onClick={handleStopScript} variant="destructive" size="lg" className="bg-[hsl(var(--status-error))]">
                      <Square className="mr-2 h-5 w-5" />
                      STOP
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Uploaded Script</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Script Viewer with Line Highlighting - READ ONLY */}
                  <div
                    ref={scriptViewerRef}
                    className="bg-muted/50 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs border border-border select-none"
                  >
                    {uploadedScript
                      ? uploadedScript.split('\n').map((line, index) => {
                          const lineNumber = index + 1;
                          const isCurrentLine = currentLine === lineNumber;
                          return (
                            <div
                              key={lineNumber}
                              data-line={lineNumber}
                              className={`flex leading-relaxed ${isCurrentLine ? 'bg-green-500/20 border-l-2 border-green-500' : ''}`}
                            >
                              <span
                                className={`inline-block w-8 text-right mr-3 select-none ${
                                  isCurrentLine ? 'text-green-500 font-bold' : 'text-muted-foreground'
                                }`}
                              >
                                {lineNumber}
                              </span>
                              <span className={isCurrentLine ? 'text-foreground font-medium' : 'text-foreground'}>
                                {line || ' '}
                              </span>
                            </div>
                          );
                        })
                      : <div className="text-muted-foreground">Waiting for upload…</div>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Telemetry + Command Terminal */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Telemetry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">IR1 Temperature</span>
                    </div>
                    <span className="text-xl font-bold font-mono">{temperature.ir1.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">IR2 Temperature</span>
                    </div>
                    <span className="text-xl font-bold font-mono">{temperature.ir2.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <Badge variant="secondary">{device.status || 'idle'}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Command Terminal */}
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    <CardTitle className="text-lg">Command Terminal</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleClearTerminal} disabled={terminalEntries.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Terminal Output */}
                  <div
                    ref={terminalOutputRef}
                    className="bg-muted/50 rounded-md p-4 h-80 overflow-y-auto font-mono text-xs border border-border"
                  >
                    {terminalEntries.length === 0 ? (
                      <div className="text-muted-foreground space-y-4">
                        <p className="font-semibold">Example Commands:</p>
                        <div className="space-y-2 ml-2">
                          <div>
                            <p className="text-muted-foreground/70">-- Motor control</p>
                            <p>motor.magnet:move({'{'}position=1000, speed=50{'}'})</p>
                            <p>motor.magnet:home()</p>
                          </div>
                          <div className="mt-3">
                            <p className="text-muted-foreground/70">-- Sensor reading</p>
                            <p>sensor.ir1:read()</p>
                          </div>
                          <div className="mt-3">
                            <p className="text-muted-foreground/70">-- Script control</p>
                            <p>script.pause()</p>
                            <p>script.resume()</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {terminalEntries.map((entry) => (
                          <div key={entry.id} className="space-y-1">
                            {/* Command */}
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground text-[10px] leading-relaxed">
                                [{formatTimestamp(entry.timestamp)}]
                              </span>
                              <span className="text-primary font-semibold leading-relaxed">&gt;</span>
                              <span className="text-foreground leading-relaxed flex-1">{entry.command}</span>
                            </div>
                            {/* Response */}
                            {entry.pending ? (
                              <div className="ml-[4.5rem] text-muted-foreground leading-relaxed">Executing...</div>
                            ) : entry.response.length > 0 ? (
                              <div className="ml-[4.5rem] text-muted-foreground/90 space-y-0.5">
                                {entry.response.map((line, idx) => (
                                  <div key={idx} className="leading-relaxed">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Command Input */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono font-semibold">&gt;</span>
                      <Input
                        ref={terminalInputRef}
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={handleTerminalKeyDown}
                        placeholder="Enter Lua command... (Press ↑/↓ for history, Enter to send)"
                        className="font-mono text-sm pl-8 bg-muted/50"
                      />
                    </div>
                    <Button onClick={handleSendCommand} disabled={!terminalInput.trim()}>
                      Send
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tip: Use ↑/↓ arrow keys to navigate command history. Press Enter to execute.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Full Width: Live Data Chart */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Live Data</CardTitle>
            </CardHeader>
            <CardContent>
              <DataChart data={dataPoints} height={320} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">Serial Number</span>
                  <span className="font-mono font-semibold">{device.serial_number}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">COM Port</span>
                  <span className="font-mono font-semibold">{device.com_port}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">Device Status</span>
                  <Badge variant="secondary">{device.status || 'connected'}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">WebSocket Connection</span>
                  <Badge variant={isConnected ? 'default' : 'outline'}>{isConnected ? 'Connected' : 'Disconnected'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DeviceDetail;
