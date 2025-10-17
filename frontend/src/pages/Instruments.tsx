import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeviceCard } from '@/components/DeviceCard';
import { api } from '@/services/api';
import type { ConnectedDevice, ScannedDevice } from '@/types/api';
import { Search, RefreshCw, FlaskConical, Plug } from 'lucide-react';

export function Instruments() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [availableDevices, setAvailableDevices] = useState<ScannedDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [connectingDevices, setConnectingDevices] = useState<Set<string>>(new Set());

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
    // Mark device as connecting
    setConnectingDevices(prev => new Set(prev).add(serial));

    try {
      // Optimistic update - show device as connected immediately
      setDevices(prev => [...prev, { 
        serial_number: serial, 
        com_port: comPort,
        status: 'connecting' 
      }]);
      
      // Connect device
      await api.connectDevice(comPort, serial);
      
      // Give backend time to update internal state (500ms delay)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify connection
      await loadDevices();
      
      // ✅ FIXED: Only remove THIS device from available list, not all devices
      setAvailableDevices(prev => prev.filter(d => d.serial_number !== serial));
    } catch (error) {
      console.error('Failed to connect device:', error);
      
      // Rollback optimistic update on error
      await loadDevices();
    } finally {
      // Remove from connecting set
      setConnectingDevices(prev => {
        const next = new Set(prev);
        next.delete(serial);
        return next;
      });
    }
  };

  const handleConnectAll = async () => {
    // Connect all available devices in parallel
    const connectPromises = availableDevices.map(device => 
      handleConnect(device.com_port, device.serial_number)
    );
    
    try {
      await Promise.all(connectPromises);
    } catch (error) {
      console.error('Failed to connect all devices:', error);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Instruments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage XP2 electrochemical biosensor devices
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          size="lg"
          variant={isScanning ? 'scanning' : 'default'}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan for Devices'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by serial number or COM port..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Available Devices (after scan) */}
      {availableDevices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Available Devices ({availableDevices.length})</h2>
              <div className="h-px flex-1 bg-border"></div>
            </div>
            {availableDevices.length > 1 && (
              <Button 
                onClick={handleConnectAll}
                disabled={connectingDevices.size > 0}
                variant="secondary"
              >
                <Plug className="mr-2 h-4 w-4" />
                Connect All
              </Button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableDevices.map((device) => (
              <DeviceCard
                key={device.serial_number}
                serialNumber={device.serial_number}
                comPort={device.com_port}
                status={connectingDevices.has(device.serial_number) ? 'connecting' : 'disconnected'}
                onConnect={() => handleConnect(device.com_port, device.serial_number)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connected Devices */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Connected Devices ({filteredDevices.length})</h2>
          <div className="h-px flex-1 bg-border"></div>
        </div>

        {filteredDevices.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FlaskConical className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">
                {devices.length === 0 ? 'No devices connected' : 'No devices match your search'}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {devices.length === 0
                  ? 'Click "Scan for Devices" to find available XP2 instruments'
                  : 'Try adjusting your search criteria'}
              </p>
              {devices.length === 0 && (
                <Button
                  onClick={handleScan}
                  disabled={isScanning}
                  size="lg"
                  variant={isScanning ? 'scanning' : 'default'}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan for Devices'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
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
        )}
      </div>
    </div>
  );
}
