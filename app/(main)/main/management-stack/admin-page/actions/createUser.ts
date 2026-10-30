'use server';

import { randomInt } from 'crypto';
import { ADMIN_ROLES, MIN_PASSWORD, NOT_ALLOWED, callerWithRole, serviceClient } from '@/lib/auth/server';

const ROLES = ['beneficiary', 'distributor', 'sales', 'logger', 'manager', 'admin'];

function generateBeneficiaryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

// Results, not throws: production builds hide the message of an error thrown from a server action.
export async function createUserWithId(
  accessToken: string | null,
  userData: { full_name: string; password: string; role: string; phone?: string; location?: string },
): Promise<{ beneficiaryCode: string } | { error: string }> {
  const caller = await callerWithRole(accessToken, [...ADMIN_ROLES, 'manager']);
  if (!caller) return { error: NOT_ALLOWED };
  if (!ROLES.includes(userData.role)) return { error: 'Choose a role.' };
  if (userData.role === 'admin' && !ADMIN_ROLES.includes(caller.role)) return { error: NOT_ALLOWED };
  if (!userData.full_name?.trim()) return { error: 'Enter a full name.' };
  if (!userData.password || userData.password.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };

  const db = serviceClient();
  const beneficiaryCode = generateBeneficiaryCode();

  const { data, error } = await db.auth.admin.createUser({
    email: `${beneficiaryCode.toLowerCase()}@paadhyvex.local`,
    password: userData.password,
    email_confirm: true,
    user_metadata: { full_name: userData.full_name, phone: userData.phone, location: userData.location },
  });
  if (error || !data.user) return { error: error?.message ?? 'The user could not be created.' };

  const { error: profileError } = await db.from('profiles').update({
    full_name: userData.full_name,
    phone: userData.phone,
    location: userData.location,
    role: userData.role,
    status: 'active',
    beneficiary_code: beneficiaryCode,
  }).eq('id', data.user.id);
  if (profileError) return { error: profileError.message };

  return { beneficiaryCode };
}
