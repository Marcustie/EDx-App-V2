import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataChart } from '@/components/DataChart';
import { ScriptEditor } from '@/components/ScriptEditor';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/services/api';
import type { DataPoint } from '@/types';
import { Play, Square, Upload, Thermometer, Activity } from 'lucide-react';

export function DeviceDetail() {
  const [, params] = useRoute('/instruments/:serial');
  const serialNumber = params?.serial || '';
  
  const [device, setDevice] = useState<any>(null);
  const [script, setScript] = useState('-- Lua script\nprint("Hello, XP2!")');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [currentLine, setCurrentLine] = useState<number | undefined>();
  const [output, setOutput] = useState<string[]>([]);
  const [temperature, setTemperature] = useState({ ir1: 0, ir2: 0 });
  const [activeTab, setActiveTab] = useState('control');

  const { events, isConnected } = useWebSocket(serialNumber);

  useEffect(() => {
    loadDevice();
  }, [serialNumber]);

  useEffect(() => {
    events.forEach((event) => {
      switch (event.type) {
        case 'data-sample':
          setDataPoints((prev) => [...prev, { index: event.index, value: event.value }]);
          break;
        case 'script-position':
          setCurrentLine(event.line);
          break;
        case 'script-output':
        case 'log':
          setOutput((prev) => [...prev, event.message]);
          break;
        case 'temperature':
          setTemperature((prev) => ({ ...prev, [event.sensor]: event.value }));
          break;
      }
    });
  }, [events]);

  const loadDevice = async () => {
    try {
      const devices = await api.getConnectedDevices();
      const found = devices.find((d: any) => d.serial_number === serialNumber);
      setDevice(found);
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  const handleUploadScript = async () => {
    try {
      await api.uploadScript(serialNumber, script);
      setOutput((prev) => [...prev, 'Script uploaded successfully']);
    } catch (error) {
      console.error('Failed to upload script:', error);
      setOutput((prev) => [...prev, 'Failed to upload script']);
    }
  };

  const handleRunScript = async () => {
    try {
      setDataPoints([]);
      setOutput([]);
      setCurrentLine(undefined);
      await api.runScript(serialNumber);
      setOutput((prev) => [...prev, 'Script execution started']);
    } catch (error) {
      console.error('Failed to run script:', error);
      setOutput((prev) => [...prev, 'Failed to run script']);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectDevice(serialNumber);
      window.location.href = '/instruments';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-mono">{serialNumber}</h1>
          <p className="text-muted-foreground mt-1">{device.com_port}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? 'success' : 'outline'}>
            {isConnected ? 'WebSocket Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="control" data-state={activeTab === 'control' ? 'active' : ''}>
            Control
          </TabsTrigger>
          <TabsTrigger value="script" data-state={activeTab === 'script' ? 'active' : ''}>
            Script
          </TabsTrigger>
          <TabsTrigger value="info" data-state={activeTab === 'info' ? 'active' : ''}>
            Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleRunScript} className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    START
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    <Square className="mr-2 h-4 w-4" />
                    STOP
                  </Button>
                </div>
                <Button onClick={handleUploadScript} variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Script
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Telemetry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Thermometer className="mr-2 h-4 w-4" />
                    <span className="text-sm">IR1 Temperature</span>
                  </div>
                  <span className="font-mono">{temperature.ir1.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Thermometer className="mr-2 h-4 w-4" />
                    <span className="text-sm">IR2 Temperature</span>
                  </div>
                  <span className="font-mono">{temperature.ir2.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="mr-2 h-4 w-4" />
                    <span className="text-sm">Status</span>
                  </div>
                  <Badge>{device.status || 'idle'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Live Data</CardTitle>
            </CardHeader>
            <CardContent>
              <DataChart data={dataPoints} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Output Console</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4 h-64 overflow-y-auto font-mono text-sm">
                {output.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
                {output.length === 0 && (
                  <div className="text-muted-foreground">No output yet...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Script Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <ScriptEditor
                script={script}
                currentLine={currentLine}
                onChange={setScript}
              />
              <div className="flex gap-2 mt-4">
                <Button onClick={handleUploadScript}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button onClick={handleRunScript} variant="secondary">
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-mono">{device.serial_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COM Port</p>
                <p className="font-mono">{device.com_port}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{device.status || 'connected'}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WebSocket Connection</p>
                <Badge variant={isConnected ? 'success' : 'outline'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
