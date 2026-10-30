import { createClient } from '@supabase/supabase-js';

/** Full database access. Server code only: every caller must decide who is allowed first. */
export function serviceClient() {
  return createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Who is really calling, from their own session token, with their role read from the database. The
 * browser's word is never taken for either. Returns null unless they hold one of `roles`.
 */
export async function callerWithRole(accessToken: string | null | undefined, roles: string[]) {
  if (typeof accessToken !== 'string' || !accessToken) return null;
  const db = serviceClient();
  const { data: { user }, error } = await db.auth.getUser(accessToken);
  if (error || !user) return null;
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !roles.includes(profile.role)) return null;
  return { id: user.id, role: profile.role as string };
}

export const NOT_ALLOWED = 'You do not have permission to do this. Sign in again if that seems wrong.';
export const MIN_PASSWORD = 6;
