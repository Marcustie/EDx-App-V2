import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeviceCard } from '@/components/DeviceCard';
import { api } from '@/services/api';
import { Activity, Cpu, FileCode, PlayCircle } from 'lucide-react';

export function Dashboard() {
  const [devices, setDevices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    active: 0,
    scripts: 0,
  });

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const connected = await api.getConnectedDevices();
      setDevices(connected.slice(0, 8));
      setStats({
        total: connected.length,
        online: connected.filter((d: any) => d.status !== 'disconnected').length,
        active: connected.filter((d: any) => d.status === 'running').length,
        scripts: 0,
      });
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleScan = async () => {
    try {
      await api.scanDevices();
      await loadDevices();
    } catch (error) {
      console.error('Failed to scan devices:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleScan}>Scan Devices</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.online}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scripts</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scripts}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Devices</h2>
          <Link href="/instruments">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {devices.map((device) => (
            <Link key={device.serial_number} href={`/instruments/${device.serial_number}`}>
              <DeviceCard
                serialNumber={device.serial_number}
                comPort={device.com_port}
                status={device.status || 'connected'}
              />
            </Link>
          ))}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No devices connected. Click "Scan Devices" to find available instruments.
          </div>
        )}
      </div>
    </div>
  );
}
