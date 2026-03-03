import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { Login } from './pages/Login';
import { Dashboard, Queue, POS, Customers, Inventory, Services, Suppliers, Employees, Finance, Reports, Settings } from './pages';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './hooks/useAuth';
import { setupRealtimeSync } from './lib/sync';
import { useAuthStore } from './stores/useAuthStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { GlobalDialogs } from './components/GlobalDialogs';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    // Setup Realtime subscriptions to receive live data updates
    const cleanupRealtime = setupRealtimeSync();

    return () => {
      cleanupRealtime();
    };
  }, [isAuthenticated]);



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
