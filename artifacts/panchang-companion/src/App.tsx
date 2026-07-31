import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Link, useLocation } from 'wouter';
import Today from '@/pages/Today';
import Upcoming from '@/pages/Upcoming';
import Lookup from '@/pages/Lookup';
import Learn from '@/pages/Learn';
import Settings from '@/pages/Settings';
import { Calendar, BookOpen, Settings as SettingsIcon, Sun } from 'lucide-react';

const queryClient = new QueryClient();

function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Today', icon: Sun },
    { path: '/upcoming', label: 'Upcoming', icon: Calendar },
    { path: '/learn', label: 'Learn', icon: BookOpen },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-2xl mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[72px] ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/upcoming" component={Upcoming} />
        <Route path="/lookup" component={Lookup} />
        <Route path="/learn" component={Learn} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
