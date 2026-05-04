'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import AuthBlocker from '@/components/AuthBlocker/AuthBlocker';

interface AuthContextType {
  initialized: boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
  return context;
}

// Routes anyone can visit without auth
const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/about', '/stories'];
// Routes only for unauthenticated users (logged-in users get bounced to /main)
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isProtectedRoute = !isPublicRoute && !isAuthRoute;

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabaseBrowser.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setInitialized(true);

          if (initialSession) {
            // Logged in — redirect away from auth pages and public pages that have in-app equivalents
            if (isAuthRoute) {
              router.replace('/main');
            } else if (pathname === '/stories') {
              router.replace('/main');
            }
          } else {
            // Not logged in — redirect away from protected routes
            if (isProtectedRoute) {
              router.replace('/login');
            }
          }
        }

        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
          (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession);

            if (newSession) {
              // Just signed in — go to main if on auth page
              if (isAuthRoute) router.replace('/main');
            } else {
              // Just signed out — go to login if on protected route
              if (isProtectedRoute) router.replace('/login');
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('[AUTH] Error:', error);
        if (mounted) setInitialized(true);
      }
    };

    const cleanup = initializeAuth();

    return () => {
      mounted = false;
      cleanup?.then(unsub => unsub?.());
    };
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ initialized, session }}>
      <AuthBlocker>{children}</AuthBlocker>
    </AuthContext.Provider>
  );
}
