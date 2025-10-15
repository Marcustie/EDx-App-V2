import { Route, Switch } from 'wouter';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dashboard } from '@/pages/Dashboard';
import { Instruments } from '@/pages/Instruments';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Scripts } from '@/pages/Scripts';

function App() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col ml-[280px] transition-all duration-300">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">
              {/* Page title will be shown by each page component */}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1920px] mx-auto p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/instruments" component={Instruments} />
              <Route path="/instruments/:serial" component={DeviceDetail} />
              <Route path="/scripts" component={Scripts} />
              <Route>
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">404 - Page not found</p>
                </div>
              </Route>
            </Switch>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
