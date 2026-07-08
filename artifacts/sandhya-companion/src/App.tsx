import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Today from '@/pages/Today';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Today} />
      <Route path="/settings" component={Settings} />
      <Route>
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-serif font-bold text-primary">Page Not Found</h1>
            <p className="text-xl text-muted-foreground">The page you are looking for does not exist.</p>
            <a href="/" className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors">
              Return Home
            </a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
