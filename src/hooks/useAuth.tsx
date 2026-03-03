import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import type { UserRole, User } from '../types';
import type { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, hasRole } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      let session: Session | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      } catch {
        session = null;
      }

      if (!mounted) return;

      if (!session) {
        // No valid Supabase session — always redirect to login
        useAuthStore.getState().logout();
        navigate('/login', { replace: true });
        return;
      }

      // If we have a session but no app-level user, fetch from users table
      if (!user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData && mounted) {
            useAuthStore.getState().setUser(userData as User);
          } else {
            // User not in users table — sign out and redirect
            await supabase.auth.signOut();
            navigate('/login', { replace: true });
            return;
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
          navigate('/login', { replace: true });
          return;
        }
      }

      if (mounted) {
        setIsChecking(false);
        useAuthStore.getState().setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes (token refresh, sign out events)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
        navigate('/login', { replace: true });
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, user]);

  // Check role requirements
  useEffect(() => {
    if (!isChecking && requiredRoles && user) {
      if (!hasRole(requiredRoles)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isChecking, requiredRoles, user, hasRole, navigate]);

  // Show loading state
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect happens in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If role check fails, don't render children (redirect happens in useEffect)
  if (requiredRoles && !hasRole(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
}
