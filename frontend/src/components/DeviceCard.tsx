import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Thermometer, Signal } from 'lucide-react';

interface DeviceCardProps {
  serialNumber: string;
  comPort: string;
  status?: string;
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

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'idle':
        return 'bg-[hsl(var(--status-online))]';
      case 'running':
        return 'bg-[hsl(var(--status-running))]';
      case 'error':
        return 'bg-[hsl(var(--status-error))]';
      default:
        return 'bg-[hsl(var(--status-inactive))]';
    }
  };

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/50" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`}></div>
            <CardTitle className="text-base font-mono tracking-tight">{truncatedSerial}</CardTitle>
          </div>
          <Badge 
            variant={status === 'disconnected' ? 'outline' : 'secondary'}
            className="text-xs font-semibold"
          >
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Activity className="mr-2 h-4 w-4" />
          <span className="font-mono">{comPort}</span>
        </div>
        
        {temperature && (temperature.ir1 || temperature.ir2) && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Thermometer className="mr-2 h-4 w-4" />
            <span>
              {temperature.ir1 && `IR1: ${temperature.ir1.toFixed(1)}°C`}
              {temperature.ir1 && temperature.ir2 && ' | '}
              {temperature.ir2 && `IR2: ${temperature.ir2.toFixed(1)}°C`}
            </span>
          </div>
        )}

        {!temperature && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Signal className="mr-2 h-4 w-4" />
            <span>XP2 Biosensor</span>
          </div>
        )}

        {(onConnect || onDisconnect) && (
          <div className="flex gap-2 pt-2">
            {status === 'disconnected' && onConnect && (
              <Button
                size="sm"
                className="w-full"
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
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnect();
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
