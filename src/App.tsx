import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { Login } from './pages/Login';
import { Dashboard, Queue, POS, Customers, Inventory, Services, Suppliers, Employees, Finance, Reports, Settings } from './pages';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './hooks/useAuth';
import { pullChanges, pushChanges, setupRealtimeSync } from './lib/sync';
import { useAuthStore } from './stores/useAuthStore';
import { Database } from 'lucide-react';
import { GlobalDialogs } from './components/GlobalDialogs';

function App() {
  const { isAuthenticated } = useAuthStore();
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const performInitialSync = async () => {
      setIsInitialSyncing(true);
      try {
        await pushChanges();
        await pullChanges();
      } catch (err) {
        console.error('Initial sync failed', err);
      } finally {
        if (mounted) setIsInitialSyncing(false);
      }
    };

    performInitialSync();

    // Setup Realtime subscriptions
    const cleanupRealtime = setupRealtimeSync();

    // Setup listeners for network status
    const handleOnline = () => {
      pushChanges();
      pullChanges();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      cleanupRealtime();
    };
  }, [isAuthenticated]);

  if (isInitialSyncing) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-500/20 rounded-full blur-[40px]"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary-500/10 rounded-full blur-[40px]"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-primary-500/10 border-2 border-primary-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <Database className="w-10 h-10 text-primary-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Synchronisation</h2>
            <p className="text-[var(--text-secondary)] mb-8 text-sm leading-relaxed">
              Veuillez patienter pendant le téléchargement des données sécurisées depuis le serveur...
            </p>

            <div className="flex justify-center gap-2">
              <span className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="pos" element={<POS />} />
          <Route path="customers" element={<Customers />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="services" element={<Services />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="employees" element={<Employees />} />

          {/* Manager+ Routes */}
          <Route
            path="finance"
            element={
              <ProtectedRoute requiredRoles={['manager', 'admin']}>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredRoles={['manager', 'admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <GlobalDialogs />
    </BrowserRouter>
  );
}

export default App;
