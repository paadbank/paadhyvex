'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { loginWithBeneficiaryId } from '@/lib/auth/beneficiaryAuth';
import { AuthFrame, FormError } from '@/components/public/auth-frame';
import { Button, Form, Segmented, TextField } from '@/components/ui/controls';

const METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'id', label: 'Beneficiary code' },
];

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [method, setMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    setLoading(true);
    setError('');
    try {
      if (method === 'id') {
        const data = await loginWithBeneficiaryId(identifier, password);
        if (data.session) router.push('/main');
        return;
      }
      const { data, error: failure } = await supabaseBrowser.auth.signInWithPassword({ email: identifier, password });
      if (failure) {
        if (failure.message === 'Email not confirmed') {
          await supabaseBrowser.auth.resend({ type: 'signup', email: identifier });
          router.push(`/signup/verification?email=${encodeURIComponent(identifier)}`);
          return;
        }
        throw failure;
      }
      if (data.session) router.push('/main');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title={t('login') || 'Login'}
      footer={
        <>
          <Link href="/forgot-password/request-reset">{t('forgot_password') || 'Forgot password?'}</Link>
          <Link href="/signup">{t('no_account') || "Don't have an account? Sign up"}</Link>
        </>
      }
    >
      <Segmented value={method} options={METHODS} onChange={(next) => { setMethod(next); setIdentifier(''); }} />
      <Form onSubmit={login}>
        {method === 'email' ? (
          <TextField label={t('email') || 'Email'} type="email" keyboardType="email" autoComplete="email" value={identifier} onChange={setIdentifier} required disabled={loading} />
        ) : (
          <TextField label="Beneficiary code" transform="uppercase" autoComplete="username" value={identifier} onChange={setIdentifier} required disabled={loading} />
        )}
        <TextField label={t('password') || 'Password'} secureToggle autoComplete="current-password" value={password} onChange={setPassword} required disabled={loading} />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" full busy={loading}>{t('login') || 'Login'}</Button>
      </Form>
    </AuthFrame>
  );
}
