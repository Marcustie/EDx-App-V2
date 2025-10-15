import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DataPoint } from '@/types';

interface DataChartProps {
  data: DataPoint[];
  maxPoints?: number;
}

export function DataChart({ data, maxPoints = 300 }: DataChartProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    const latest = data.slice(-maxPoints);
    setChartData(latest);
  }, [data, maxPoints]);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="index" 
            label={{ value: 'Sample Index', position: 'insideBottom', offset: -5 }}
            className="text-xs"
          />
          <YAxis 
            label={{ value: 'Value (μA)', angle: -90, position: 'insideLeft' }}
            className="text-xs"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
