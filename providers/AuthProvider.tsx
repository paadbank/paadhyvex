'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Mark } from '@/components/ui/logo';
import { Loading } from '@/components/ui/page';

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
// The emailed reset link signs the person in, and they must stay here to choose a password.
const RESET_ROUTE = '/forgot-password/reset-password';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthRoute = pathname !== RESET_ROUTE && AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedRoute = !isPublicRoute && !isAuthRoute;

  useEffect(() => {
    let mounted = true;

    supabaseBrowser.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return;
      setSession(initial);
      setInitialized(true);
      if (initial) {
        if (isAuthRoute || pathname === '/stories') router.replace('/main');
      } else if (isProtectedRoute) {
        router.replace('/login');
      }
    }).catch((error) => {
      console.error('[AUTH] Error:', error);
      if (mounted) setInitialized(true);
    });

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (next) {
        if (isAuthRoute) router.replace('/main');
      } else if (isProtectedRoute) {
        router.replace('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  // A public page is drawn straight away; only pages that depend on the session wait for it.
  const ready = isPublicRoute || initialized;

  return (
    <AuthContext.Provider value={{ initialized, session }}>
      {ready ? children : (
        <div style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 'var(--space-4)', minHeight: '100dvh' }}>
          <Mark size={48} />
          <Loading />
        </div>
      )}
    </AuthContext.Provider>
  );
}
