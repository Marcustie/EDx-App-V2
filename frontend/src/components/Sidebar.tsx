import { Link, useRoute } from 'wouter';
import { LayoutDashboard, Activity, FileCode, GitBranch, FlaskConical, BookOpen, FileSpreadsheet } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instruments', label: 'Instruments', icon: Activity },
  { href: '/scripts', label: 'Scripts', icon: FileCode },
  { href: '/runs', label: 'Runs', icon: GitBranch },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/labguru', label: 'LabGuru', icon: BookOpen },
  { href: '/audit', label: 'Audit Log', icon: FileSpreadsheet },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [, params] = useRoute('/:page?');

  const isActive = (href: string) => {
    if (href === '/') return params?.page === undefined;
    return href.startsWith('/' + params?.page);
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 flex flex-col z-40 ${
        collapsed ? 'w-16' : 'w-[280px]'
      }`}
    >
      {/* Logo / Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-semibold">ElectraDx</h1>
              <p className="text-xs font-mono text-muted-foreground">XP2 Control</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
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
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
