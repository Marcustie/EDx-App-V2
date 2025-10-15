import { Route, Link, useLocation } from 'wouter';
import { Dashboard } from '@/pages/Dashboard';
import { Instruments } from '@/pages/Instruments';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Scripts } from '@/pages/Scripts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutDashboard, Cpu, FileCode } from 'lucide-react';

function App() {
  const [location] = useLocation();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/instruments', label: 'Instruments', icon: Cpu },
    { href: '/scripts', label: 'Scripts', icon: FileCode },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <h1 className="text-2xl font-bold cursor-pointer">EDx Lab Platform</h1>
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                        isActive(item.href)
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Route path="/" component={Dashboard} />
        <Route path="/instruments" component={Instruments} />
        <Route path="/instruments/:serial" component={DeviceDetail} />
        <Route path="/scripts" component={Scripts} />
      </main>
    </div>
  );
}

export default App;
