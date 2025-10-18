import { useState } from 'react';
import { Route, Switch } from 'wouter';
import { Sidebar } from '@/components/Sidebar';
import { TopHeaderBar } from '@/components/TopHeaderBar';
import { StatusBar } from '@/components/StatusBar';
import { Dashboard } from '@/pages/Dashboard';
import { Instruments } from '@/pages/Instruments';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Scripts } from '@/pages/Scripts';
import { Runs } from '@/pages/Runs';
import { Analysis } from '@/pages/Analysis';
import { LabGuru } from '@/pages/LabGuru';
import { AuditLog } from '@/pages/AuditLog';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConnected] = useState(true);
  const [retryCount] = useState(0);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-[280px]'
        }`}
      >
        {/* Top Header Bar */}
        <TopHeaderBar 
          onToggleSidebar={toggleSidebar} 
          isConnected={isConnected}
        />

        {/* Status Bar (conditional - only when disconnected) */}
        {!isConnected && <StatusBar retryCount={retryCount} />}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1920px] mx-auto p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/instruments" component={Instruments} />
              <Route path="/instruments/:serial" component={DeviceDetail} />
              <Route path="/scripts" component={Scripts} />
              <Route path="/runs" component={Runs} />
              <Route path="/analysis" component={Analysis} />
              <Route path="/labguru" component={LabGuru} />
              <Route path="/audit" component={AuditLog} />
              <Route>
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">404 - Page not found</p>
                </div>
              </Route>
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
