import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import type { UserRole, User } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, hasRole } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase session with a 5s timeout to avoid infinite loading
      let session: any = null;
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 5000)
        );
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = result.data.session;
      } catch {
        session = null;
      }

      if (!session) {
        // If we have a persisted user without an active Supabase session, treating as offline login
        if (user) {
          setIsChecking(false);
          return;
        }
        navigate('/login', { replace: true });
        return;
      }

      // If we have a session but no user in store, fetch user data
      if (!user) {
        let userData = await db.users.get(session.user.id);

        if (!userData && navigator.onLine) {
          try {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (data) {
              userData = data;
              await db.users.put(data);
            }
          } catch (e) { console.error(e) }
        }

        if (userData) {
          useAuthStore.getState().setUser(userData as any as User);
        } else {
          // User record doesn't exist, sign out
          try { await supabase.auth.signOut(); } catch (e) { }
          navigate('/login', { replace: true });
          return;
        }
      }

      setIsChecking(false);
      useAuthStore.getState().setLoading(false);
    };

    checkAuth();
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
