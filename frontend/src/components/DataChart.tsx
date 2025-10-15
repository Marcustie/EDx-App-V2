import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DataPoint } from '@/types';

interface DataChartProps {
  data: DataPoint[];
  maxPoints?: number;
  height?: number;
}

export function DataChart({ data, maxPoints = 300, height = 320 }: DataChartProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    const latest = data.slice(-maxPoints);
    setChartData(latest);
  }, [data, maxPoints]);

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.5}
          />
          <XAxis 
            dataKey="index" 
            label={{ value: 'Sample Index', position: 'insideBottom', offset: -5 }}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            label={{ value: 'Value (μA)', angle: -90, position: 'insideLeft' }}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            stroke="hsl(var(--border))"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            itemStyle={{ color: 'hsl(var(--primary))' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={100}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
