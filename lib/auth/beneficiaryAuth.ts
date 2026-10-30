import { supabaseBrowser } from '@/lib/supabase/client';

export async function loginWithBeneficiaryId(beneficiaryCode: string, password: string) {
  const response = await fetch('/api/beneficiary-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: beneficiaryCode }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Invalid beneficiary code');

  const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email: result.email, password });
  if (error) throw error;
  return data;
}
