import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PotentiostatChartProps {
  devices: Array<{
    serial: string;
    showInChart: boolean;
    rtiaChannel?: 'A' | 'B' | 'C';
  }>;
  onToggleDevice: (serial: string) => void;
  onChannelChange?: (serial: string, channel: 'A' | 'B' | 'C') => void;
}

export function PotentiostatChart({ devices, onToggleDevice, onChannelChange }: PotentiostatChartProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Placeholder data for demonstration
  const placeholderData = Array.from({ length: 50 }, (_, i) => {
    const baseData: any = { time: i * 0.1 };
    devices.forEach((device, idx) => {
      if (device.showInChart) {
        baseData[device.serial] = Math.sin(i * 0.2 + idx) * 50 + Math.random() * 10;
      }
    });
    return baseData;
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Potentiostat Chart - Chronoamperometry</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Device checkboxes and channel selectors */}
          <div className="flex flex-wrap gap-4">
            {devices.map((device, idx) => (
              <div key={device.serial} className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={device.showInChart}
                    onChange={() => onToggleDevice(device.serial)}
                    className="h-4 w-4 rounded border-2"
                  />
                  <span className="text-xs font-mono" style={{ color: colors[idx % colors.length] }}>
                    {device.serial}
                  </span>
                </label>
                
                {onChannelChange && (
                  <select
                    value={device.rtiaChannel || 'A'}
                    onChange={(e) => onChannelChange(device.serial, e.target.value as 'A' | 'B' | 'C')}
                    className="h-6 px-2 text-xs rounded border bg-background"
                    disabled={!device.showInChart}
                  >
                    <option value="A">RTIA A</option>
                    <option value="B">RTIA B</option>
                    <option value="C">RTIA C</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={placeholderData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Current (μA)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                {devices.map((device, idx) =>
                  device.showInChart ? (
                    <Line
                      key={device.serial}
                      type="monotone"
                      dataKey={device.serial}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground italic">
            Placeholder data. Real-time data will populate from WebSocket data-sample events.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
