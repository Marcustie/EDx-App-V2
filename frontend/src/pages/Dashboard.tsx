import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeviceCard } from '@/components/DeviceCard';
import { api } from '@/services/api';
import { FlaskConical, Activity, Play, FileCode, RefreshCw } from 'lucide-react';

interface Device {
  serial_number: string;
  com_port: string;
  status?: string;
}

export function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const connected = await api.getConnectedDevices();
      setDevices(connected);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      await api.scanDevices();
      await loadDevices();
    } catch (error) {
      console.error('Failed to scan devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const onlineCount = devices.filter(d => d.status !== 'disconnected').length;
  const activeCount = devices.filter(d => d.status === 'running').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">System overview and device status</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleScan} disabled={loading} size="lg">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Scan Devices
          </Button>
          <Link 
            href="/instruments"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
          >
            View All Instruments
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Total Devices
            </CardTitle>
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected instruments
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Online
            </CardTitle>
            <div className="h-10 w-10 rounded-md bg-[hsl(var(--status-online))]/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[hsl(var(--status-online))]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{onlineCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--status-online))] mr-1.5"></span>
              Ready for operation
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Active Runs
            </CardTitle>
            <div className="h-10 w-10 rounded-md bg-[hsl(var(--status-running))]/10 flex items-center justify-center">
              <Play className="h-5 w-5 text-[hsl(var(--status-running))]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--status-running))] mr-1.5"></span>
              Scripts executing
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Scripts
            </CardTitle>
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
              <FileCode className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Library not implemented
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Connected Devices</h2>
          {devices.length > 4 && (
            <Link 
              href="/instruments"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
            >
              View All →
            </Link>
          )}
        </div>

        {devices.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FlaskConical className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">
                No devices connected
              </p>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                Click "Scan Devices" to discover available XP2 electrochemical biosensor instruments
              </p>
              <Button onClick={handleScan} disabled={loading} size="lg">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Scan for Devices
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.slice(0, 8).map((device) => (
              <Link key={device.serial_number} href={`/instruments/${device.serial_number}`}>
                <DeviceCard
                  serialNumber={device.serial_number}
                  comPort={device.com_port}
                  status={device.status || 'connected'}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
