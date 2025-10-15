import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface TopHeaderBarProps {
  onToggleSidebar: () => void;
  isConnected: boolean;
}

export function TopHeaderBar({ onToggleSidebar, isConnected }: TopHeaderBarProps) {
  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Left: Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Right: Connection Indicator + Theme Toggle */}
      <div className="flex items-center gap-4">
        {/* Connection Indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-online))]"></div>
              <span className="text-sm font-medium">Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-error))] animate-pulse"></div>
              <span className="text-sm font-medium text-[hsl(var(--status-error))]">Disconnected</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </div>
  );
}
