'use server';

import { createClient } from '@supabase/supabase-js';

function generateBeneficiaryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createUserWithId(userData: {
  full_name: string;
  password: string;
  role: string;
  phone?: string;
  location?: string;
}) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const beneficiaryCode = generateBeneficiaryCode();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: `${beneficiaryCode.toLowerCase()}@paadhyvex.local`,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      full_name: userData.full_name,
      phone: userData.phone,
      location: userData.location,
    }
  });

  if (error) throw error;

  if (data.user) {
    await supabaseAdmin.from('profiles').update({
      full_name: userData.full_name,
      phone: userData.phone,
      location: userData.location,
      role: userData.role,
      status: 'active',
      beneficiary_code: beneficiaryCode,
    }).eq('id', data.user.id);

    return { userId: data.user.id, beneficiaryCode, email: data.user.email };
  }

  throw new Error('Failed to create user');
}
