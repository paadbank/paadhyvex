import { NextRequest, NextResponse } from 'next/server';
import { MIN_PASSWORD, serviceClient } from '@/lib/auth/server';

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Sign-up with a code from an admin: gives a code-only account its own email and password. The code
 * is the proof, and only an account still on its placeholder address can be claimed, so this can
 * never change the login of someone who already has one.
 */
export async function POST(request: NextRequest) {
  const { code, email, password } = await request.json().catch(() => ({}));
  if (typeof code !== 'string' || !code.trim()) return fail('Enter your profile code.');
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return fail(`Use a password of at least ${MIN_PASSWORD} characters.`);

  const db = serviceClient();
  const { data: profile } = await db.from('profiles').select('id, email').eq('beneficiary_code', code.trim().toUpperCase()).maybeSingle();
  if (!profile) return fail('That profile code was not found. Check it and try again.', 404);
  if (profile.email && !profile.email.endsWith('@paadhyvex.local')) return fail('This profile is already linked to an email.', 409);

  const { error } = await db.auth.admin.updateUserById(profile.id, { email, password, email_confirm: true });
  if (error) return fail(error.message);

  const { error: profileError } = await db.from('profiles').update({ email }).eq('id', profile.id);
  if (profileError) return fail('The email could not be saved. Try again.', 500);

  return NextResponse.json({ success: true });
}
