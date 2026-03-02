import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CustomerLayout from './components/CustomerLayout';
import DashboardPage from './pages/DashboardPage';
import GaragePage from './pages/GaragePage';
import HistoryPage from './pages/HistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return null; // Avoid flicker
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-base)] text-white font-sans selection:bg-primary-500/30">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside Layout */}
          <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/garage" element={<GaragePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
