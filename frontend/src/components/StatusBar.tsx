import { RefreshCw } from 'lucide-react';

interface StatusBarProps {
  retryCount: number;
}

export function StatusBar({ retryCount }: StatusBarProps) {
  return (
    <div className="h-12 bg-[hsl(var(--status-warning))]/10 border-b border-[hsl(var(--status-warning))] flex items-center justify-center gap-2">
      <RefreshCw className="h-4 w-4 text-[hsl(var(--status-warning))] animate-spin" />
      <span className="text-sm font-medium text-[hsl(var(--status-warning))]">
        Reconnecting... ({retryCount}/∞)
      </span>
    </div>
  );
}
