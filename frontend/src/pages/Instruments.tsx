import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DeviceCard } from '@/components/DeviceCard';
import { api } from '@/services/api';
import { Search } from 'lucide-react';

export function Instruments() {
  const [devices, setDevices] = useState<any[]>([]);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 3000);
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
    setIsScanning(true);
    try {
      const scanned = await api.scanDevices();
      setAvailableDevices(scanned);
      await loadDevices();
    } catch (error) {
      console.error('Failed to scan devices:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (comPort: string, serial: string) => {
    try {
      await api.connectDevice(comPort, serial);
      await loadDevices();
      setAvailableDevices([]);
    } catch (error) {
      console.error('Failed to connect device:', error);
    }
  };

  const handleDisconnect = async (serial: string) => {
    try {
      await api.disconnectDevice(serial);
      await loadDevices();
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

  const filteredDevices = devices.filter((device) =>
    device.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.com_port.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Instruments</h1>
        <Button onClick={handleScan} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Scan for Devices'}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {availableDevices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Devices</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableDevices.map((device) => (
              <DeviceCard
                key={device.serial_number}
                serialNumber={device.serial_number}
                comPort={device.com_port}
                status="disconnected"
                onConnect={() => handleConnect(device.com_port, device.serial_number)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Connected Devices ({filteredDevices.length})</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices.map((device) => (
            <Link key={device.serial_number} href={`/instruments/${device.serial_number}`}>
              <DeviceCard
                serialNumber={device.serial_number}
                comPort={device.com_port}
                status={device.status || 'connected'}
                onDisconnect={() => handleDisconnect(device.serial_number)}
              />
            </Link>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {devices.length === 0
              ? 'No devices connected. Click "Scan for Devices" to find available instruments.'
              : 'No devices match your search.'}
          </div>
        )}
      </div>
    </div>
  );
}
