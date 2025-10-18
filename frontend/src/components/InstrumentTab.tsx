import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Send } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAppStore } from '@/store/appStore';
import { api } from '@/services/api';
import { MetadataBox } from './MetadataBox';

interface InstrumentTabProps {
  serialNumber: string;
}

export function InstrumentTab({ serialNumber }: InstrumentTabProps) {
  const { events, isConnected } = useWebSocket(serialNumber);
  const [command, setCommand] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  const deviceState = useAppStore((state) => state.perDevice[serialNumber]);
  const setScriptReady = useAppStore((state) => state.setScriptReady);
  const setCurrentLine = useAppStore((state) => state.setCurrentLine);
  const setIsRunning = useAppStore((state) => state.setIsRunning);
  const setCaptureActive = useAppStore((state) => state.setCaptureActive);
  const setMetadataTags = useAppStore((state) => state.setMetadataTags);

  // Process WebSocket events
  useEffect(() => {
    events.forEach((event) => {
      switch (event.type) {
        case 'script-position':
          setCurrentLine(serialNumber, event.line || 0);
          break;
        case 'script-output':
          setConsoleOutput((prev) => [...prev.slice(-200), event.message || '']);
          break;
        case 'log':
          if (event.message?.includes('backend-finished')) {
            setScriptReady(serialNumber, true);
            setCaptureActive(serialNumber, false);
          }
          setConsoleOutput((prev) => [...prev.slice(-200), event.message || '']);
          break;
      }
    });
  }, [events, serialNumber]);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutput]);

  const handleRunScript = async () => {
    try {
      setIsRunning(serialNumber, true);
      setCurrentLine(serialNumber, 0);
      await api.runScript(serialNumber);
    } catch (error) {
      console.error('Failed to run script:', error);
      setIsRunning(serialNumber, false);
    }
  };

  const handleStopScript = async () => {
    try {
      // TODO: Implement stop endpoint when backend supports it
      await api.sendCommand(serialNumber, '!script_stop');
      setIsRunning(serialNumber, false);
    } catch (error) {
      console.error('Failed to stop script:', error);
    }
  };

  const handleSendCommand = async () => {
    if (!command.trim()) return;
    try {
      await api.sendCommand(serialNumber, command);
      setConsoleOutput((prev) => [...prev, `> ${command}`]);
      setCommand('');
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  };

  const scriptLines = deviceState?.uploadedScript?.split('\n') || [];
  const currentLine = deviceState?.currentLine || 0;

  return (
    <div className="space-y-4">
      {/* Script Viewer + Console Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Script Viewer */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Script Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceState?.uploadedScript ? (
              <div className="bg-muted rounded-md p-4 h-96 overflow-auto font-mono text-xs">
                {scriptLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      idx === currentLine && deviceState?.isRunning
                        ? 'bg-primary/20 text-primary font-semibold'
                        : ''
                    }`}
                  >
                    <span className="inline-block w-8 text-muted-foreground select-none">
                      {idx + 1}
                    </span>
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <p className="text-sm text-muted-foreground">No script uploaded</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the script library drawer to upload a script
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Panel */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Run/Stop Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleRunScript}
                disabled={!deviceState?.uploadedScriptReady || deviceState?.isRunning}
                className="flex-1 bg-[hsl(var(--status-online))] hover:bg-[hsl(var(--status-online))]/90"
              >
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
              <Button
                onClick={handleStopScript}
                disabled={!deviceState?.isRunning}
                className="flex-1 bg-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error))]/90"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </div>

            {/* Console Output */}
            <div className="bg-muted rounded-md p-4 h-64 overflow-auto font-mono text-xs">
              {consoleOutput.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
              <div ref={consoleEndRef} />
              {consoleOutput.length === 0 && (
                <div className="text-muted-foreground italic">
                  Console output will appear here...
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Send command to device..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                className="font-mono text-xs flex-1"
                disabled={!isConnected}
              />
              <Button
                onClick={handleSendCommand}
                disabled={!isConnected || !command.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {!isConnected && (
              <p className="text-xs text-[hsl(var(--status-error))]">
                Device disconnected
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata Box */}
      <MetadataBox
        tags={deviceState?.metadataTags || []}
        onTagsChange={(tags) => setMetadataTags(serialNumber, tags)}
      />
    </div>
  );
}
