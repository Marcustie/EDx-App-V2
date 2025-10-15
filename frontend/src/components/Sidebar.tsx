import { Link, useRoute } from 'wouter';
import { LayoutDashboard, FlaskConical, FileCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instruments', label: 'Instruments', icon: FlaskConical },
  { href: '/scripts', label: 'Scripts', icon: FileCode },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [, params] = useRoute('/:page?');

  const isActive = (href: string) => {
    if (href === '/') return params?.page === undefined;
    return href.startsWith('/' + params?.page);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col z-50 ${
        collapsed ? 'w-16' : 'w-[280px]'
      }`}
    >
      {/* Logo / Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        {!collapsed && (
          <h1 className="text-lg font-bold text-primary">EDx Lab Platform</h1>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                    ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
