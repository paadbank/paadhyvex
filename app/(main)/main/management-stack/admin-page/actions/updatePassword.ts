'use server';

import { ADMIN_ROLES, MIN_PASSWORD, NOT_ALLOWED, callerWithRole, serviceClient } from '@/lib/auth/server';

export async function updateUserPassword(accessToken: string | null, userId: string, newPassword: string): Promise<{ error?: string }> {
  const caller = await callerWithRole(accessToken, ADMIN_ROLES);
  if (!caller) return { error: NOT_ALLOWED };
  if (!newPassword || newPassword.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };

  const { error } = await serviceClient().auth.admin.updateUserById(userId, { password: newPassword });
  return error ? { error: error.message } : {};
}
