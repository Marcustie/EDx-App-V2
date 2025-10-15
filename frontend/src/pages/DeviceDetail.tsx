import { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataChart } from '@/components/DataChart';
import { ScriptEditor } from '@/components/ScriptEditor';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/services/api';
import type { DataPoint } from '@/types';
import { Play, Square, Upload, Thermometer, Activity, ArrowLeft, Wifi, WifiOff } from 'lucide-react';

const MAX_DATA_POINTS = 1000;
const MAX_OUTPUT_LINES = 500;

interface Device {
  serial_number: string;
  com_port: string;
  status?: string;
}

export function DeviceDetail() {
  const [, params] = useRoute('/instruments/:serial');
  const [, navigate] = useLocation();
  const serialNumber = params?.serial || '';
  
  const [device, setDevice] = useState<Device | null>(null);
  const [script, setScript] = useState('-- Lua script\nprint("Hello, XP2!")');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [currentLine, setCurrentLine] = useState<number | undefined>();
  const [output, setOutput] = useState<string[]>([]);
  const [temperature, setTemperature] = useState({ ir1: 0, ir2: 0 });
  const [activeTab, setActiveTab] = useState('control');

  const { events, isConnected, clearEvents } = useWebSocket(serialNumber);
  const processedCountRef = useRef(0);

  useEffect(() => {
    loadDevice();
  }, [serialNumber]);

  useEffect(() => {
    const newEvents = events.slice(processedCountRef.current);
    
    newEvents.forEach((event) => {
      switch (event.type) {
        case 'data-sample':
          setDataPoints((prev) => {
            const updated = [...prev, { index: event.index, value: event.value }];
            return updated.length > MAX_DATA_POINTS ? updated.slice(-MAX_DATA_POINTS) : updated;
          });
          break;
        case 'script-position':
          setCurrentLine(event.line);
          break;
        case 'script-output':
        case 'log':
          setOutput((prev) => {
            const updated = [...prev, event.message];
            return updated.length > MAX_OUTPUT_LINES ? updated.slice(-MAX_OUTPUT_LINES) : updated;
          });
          break;
        case 'temperature':
          setTemperature((prev) => ({ ...prev, [event.sensor]: event.value }));
          break;
      }
    });

    processedCountRef.current = events.length;

    if (events.length > 500) {
      clearEvents();
      processedCountRef.current = 0;
    }
  }, [events, clearEvents]);

  const loadDevice = async () => {
    try {
      const devices = await api.getConnectedDevices();
      const found = devices.find((d: Device) => d.serial_number === serialNumber);
      setDevice(found || null);
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const handleUploadScript = async () => {
    try {
      await api.uploadScript(serialNumber, script);
      setOutput((prev) => [...prev, '✓ Script uploaded successfully']);
    } catch (error) {
      console.error('Failed to upload script:', error);
      setOutput((prev) => [...prev, '✗ Failed to upload script']);
    }
  };

  const handleRunScript = async () => {
    try {
      setDataPoints([]);
      setOutput([]);
      setCurrentLine(undefined);
      await api.runScript(serialNumber);
      setOutput((prev) => [...prev, '▶ Script execution started']);
    } catch (error) {
      console.error('Failed to run script:', error);
      setOutput((prev) => [...prev, '✗ Failed to run script']);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectDevice(serialNumber);
      navigate('/instruments');
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

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
              <><Wifi className="h-3.5 w-3.5" /> WebSocket Connected</>
            ) : (
              <><WifiOff className="h-3.5 w-3.5" /> Disconnected</>
            )}
          </Badge>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect Device
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        {/* Control Tab - 2 Column Layout */}
        <TabsContent value="control" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Controls */}
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
                      className="bg-[hsl(var(--status-online))] hover:bg-[hsl(var(--status-online))]/90"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      START
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="lg"
                      className="bg-[hsl(var(--status-error))]"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      STOP
                    </Button>
                  </div>
                  <Button onClick={handleUploadScript} variant="outline" size="lg" className="w-full">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Script
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Output Console</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs border border-border">
                    {output.map((line, index) => (
                      <div key={index} className="leading-relaxed">{line}</div>
                    ))}
                    {output.length === 0 && (
                      <div className="text-muted-foreground">No output yet...</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Telemetry */}
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

        {/* Script Tab */}
        <TabsContent value="script" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Script Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScriptEditor
                script={script}
                currentLine={currentLine}
                onChange={setScript}
              />
              <div className="flex gap-3">
                <Button onClick={handleUploadScript} size="lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button onClick={handleRunScript} variant="secondary" size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </Button>
              </div>
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
                  <Badge variant={isConnected ? 'default' : 'outline'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
