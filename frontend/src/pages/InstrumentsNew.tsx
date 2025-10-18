import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus, RefreshCw } from 'lucide-react';
import { InstrumentTab } from '@/components/InstrumentTab';
import { PotentiostatChart } from '@/components/PotentiostatChart';
import { useAppStore } from '@/store/appStore';
import { api } from '@/services/api';

const MAX_TABS = 5;

export function InstrumentsNew() {
  const connectedDevices = useAppStore((state) => state.connectedDevices);
  const activeTab = useAppStore((state) => state.activeTab);
  const perDevice = useAppStore((state) => state.perDevice);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const removeDevice = useAppStore((state) => state.removeDevice);
  const setDevices = useAppStore((state) => state.setDevices);
  const setScanInProgress = useAppStore((state) => state.setScanInProgress);
  const scanInProgress = useAppStore((state) => state.scanInProgress);
  const setShowInChart = useAppStore((state) => state.setShowInChart);
  const setRtiaChannel = useAppStore((state) => state.setRtiaChannel);
  
  const [isScriptDrawerOpen, setIsScriptDrawerOpen] = useState(false);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const connected = await api.getConnectedDevices();
      const serials = connected.map((d) => d.serial_number);
      setDevices(serials);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleScan = async () => {
    setScanInProgress(true);
    try {
      await api.scanDevices();
      await loadDevices();
    } catch (error) {
      console.error('Failed to scan devices:', error);
    } finally {
      setScanInProgress(false);
    }
  };

  const handleCloseTab = (serial: string) => {
    removeDevice(serial);
  };

  const chartDevices = connectedDevices.map((serial) => ({
    serial,
    showInChart: perDevice[serial]?.showInChart ?? true,
    rtiaChannel: perDevice[serial]?.rtiaChannel || 'A',
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header with Scan button */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2">
        <div>
          <h1 className="text-2xl font-semibold">Instruments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified workspace for multi-instrument control
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleScan} disabled={scanInProgress} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${scanInProgress ? 'animate-spin' : ''}`} />
            Scan Devices
          </Button>
          <Button onClick={() => setIsScriptDrawerOpen(!isScriptDrawerOpen)} variant="outline">
            Script Library
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b-2 bg-muted/20">
        {connectedDevices.map((serial) => (
          <button
            key={serial}
            onClick={() => setActiveTab(serial)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-t-md font-mono text-sm
              transition-colors border-2 border-b-0
              ${
                activeTab === serial
                  ? 'bg-background text-foreground border-border'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }
            `}
          >
            {serial}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(serial);
              }}
              className="ml-1 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
        
        {connectedDevices.length < MAX_TABS && (
          <button
            onClick={handleScan}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            disabled={scanInProgress}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {connectedDevices.length >= MAX_TABS && (
          <span className="ml-2 text-xs text-muted-foreground">
            Max {MAX_TABS} tabs
          </span>
        )}
      </div>

      {/* Active Tab Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {activeTab && connectedDevices.includes(activeTab) ? (
          <div className="space-y-6">
            <InstrumentTab serialNumber={activeTab} />
            
            {/* Potentiostat Chart */}
            <PotentiostatChart
              devices={chartDevices}
              onToggleDevice={(serial) => {
                const currentShow = perDevice[serial]?.showInChart ?? true;
                setShowInChart(serial, !currentShow);
              }}
              onChannelChange={(serial, channel) => setRtiaChannel(serial, channel)}
            />
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-16 border-2">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">
              No instruments open
            </p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Click "Scan Devices" to discover available instruments or connect a device to begin
            </p>
            <Button onClick={handleScan} disabled={scanInProgress}>
              <RefreshCw className={`mr-2 h-4 w-4 ${scanInProgress ? 'animate-spin' : ''}`} />
              Scan for Devices
            </Button>
          </Card>
        )}
      </div>

      {/* Script Library Drawer - TODO: Implement */}
      {isScriptDrawerOpen && (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-background border-l-2 shadow-lg z-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Script Library</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsScriptDrawerOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Script library coming soon...
          </p>
        </div>
      )}
    </div>
  );
}
