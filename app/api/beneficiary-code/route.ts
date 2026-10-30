import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/auth/server';

/**
 * Code login: the sign-in email behind a beneficiary code. Done here so that browsers don't need to
 * read the profiles table to find it. Knowing the code is required, so nothing can be listed.
 */
export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({}));
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Enter your beneficiary code.' }, { status: 400 });
  }

  const { data } = await serviceClient().from('profiles').select('email').eq('beneficiary_code', code.trim().toUpperCase()).maybeSingle();
  if (!data?.email) {
    return NextResponse.json({ error: 'That beneficiary code was not found.' }, { status: 404 });
  }
  return NextResponse.json({ email: data.email });
}
