import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Thermometer } from 'lucide-react';

interface DeviceCardProps {
  serialNumber: string;
  comPort: string;
  status?: 'connected' | 'idle' | 'running' | 'error' | 'disconnected';
  temperature?: { ir1?: number; ir2?: number };
  onClick?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function DeviceCard({
  serialNumber,
  comPort,
  status = 'disconnected',
  temperature,
  onClick,
  onConnect,
  onDisconnect,
}: DeviceCardProps) {
  const truncatedSerial = serialNumber.length > 20
    ? `${serialNumber.slice(0, 10)}...${serialNumber.slice(-8)}`
    : serialNumber;

  const statusVariant = {
    connected: 'success' as const,
    idle: 'secondary' as const,
    running: 'warning' as const,
    error: 'destructive' as const,
    disconnected: 'outline' as const,
  }[status];

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-mono">{truncatedSerial}</CardTitle>
        <Badge variant={statusVariant}>{status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Activity className="mr-2 h-4 w-4" />
            {comPort}
          </div>
          {temperature && (temperature.ir1 || temperature.ir2) && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Thermometer className="mr-2 h-4 w-4" />
              {temperature.ir1 && `IR1: ${temperature.ir1}°C`}
              {temperature.ir1 && temperature.ir2 && ' | '}
              {temperature.ir2 && `IR2: ${temperature.ir2}°C`}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            {status === 'disconnected' && onConnect && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect();
                }}
              >
                Connect
              </Button>
            )}
            {status !== 'disconnected' && onDisconnect && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnect();
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
