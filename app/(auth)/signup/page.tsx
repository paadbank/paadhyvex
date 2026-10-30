'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { today } from '@/lib/format';
import { AuthFrame, FormError } from '@/components/public/auth-frame';
import { Button, DateField, Form, TextField } from '@/components/ui/controls';

const EMPTY = { fullName: '', phone: '', location: '', occupation: '', dateOfBirth: '', email: '', profileCode: '', password: '' };

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof EMPTY>) => setValues((v) => ({ ...v, ...patch }));

  const linkProfile = async () => {
    const response = await fetch('/api/link-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: values.profileCode, email: values.email, password: values.password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The email could not be linked.');

    const { error: signIn } = await supabaseBrowser.auth.signInWithPassword({ email: values.email, password: values.password });
    if (signIn) throw signIn;
    router.push('/main');
  };

  const signUp = async () => {
    const { data, error: failure } = await supabaseBrowser.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName, phone: values.phone, location: values.location, occupation: values.occupation, date_of_birth: values.dateOfBirth } },
    });
    if (failure) throw failure;
    if (data.user) router.push(`/signup/verification?email=${encodeURIComponent(values.email)}`);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await (values.profileCode ? linkProfile() : signUp());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame title={t('signup') || 'Sign up'} footer={<Link href="/login">{t('have_account') || 'Already have an account? Login'}</Link>}>
      <Form onSubmit={submit}>
        <TextField label={t('full_name') || 'Full name'} autoComplete="name" value={values.fullName} onChange={(fullName) => set({ fullName })} required disabled={loading} />
        <TextField label={t('email') || 'Email'} type="email" keyboardType="email" autoComplete="email" value={values.email} onChange={(email) => set({ email })} required disabled={loading} />
        <TextField label={t('password') || 'Password'} secureToggle autoComplete="new-password" value={values.password} onChange={(password) => set({ password })} required disabled={loading} helperText="At least 6 characters" inputProps={{ minLength: 6 }} />
        <TextField label={t('phone') || 'Phone'} type="tel" keyboardType="tel" autoComplete="tel" value={values.phone} onChange={(phone) => set({ phone })} disabled={loading} />
        <TextField label={t('location') || 'Location'} value={values.location} onChange={(location) => set({ location })} disabled={loading} />
        <TextField label={t('occupation') || 'Occupation'} value={values.occupation} onChange={(occupation) => set({ occupation })} disabled={loading} />
        <DateField label={t('date_of_birth') || 'Date of birth'} value={values.dateOfBirth} onChange={(dateOfBirth) => set({ dateOfBirth })} max={today()} />
        <TextField label="Profile code (optional)" transform="uppercase" value={values.profileCode} onChange={(profileCode) => set({ profileCode })} helperText="Enter it if an admin gave you one" disabled={loading} />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" full busy={loading}>{t('signup') || 'Sign up'}</Button>
      </Form>
    </AuthFrame>
  );
}
