'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PinInput } from '@academix-admin/pin-input';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthFrame, FormError, FormNotice } from '@/components/public/auth-frame';
import { Button, Form } from '@/components/ui/controls';
import { Loading } from '@/components/ui/page';
import styles from './verification.module.css';

const CODE_LENGTH = 6;

function VerificationForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';
  const { t } = useLanguage();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const verify = async () => {
    if (!email || otp.length !== CODE_LENGTH) return;
    setVerifying(true);
    setError('');
    setMessage('');
    try {
      const { data, error: failure } = await supabaseBrowser.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (failure) throw failure;
      if (data?.session) router.push('/main');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!email) return;
    setResending(true);
    setMessage('');
    setError('');
    try {
      const { error: failure } = await supabaseBrowser.auth.resend({ type: 'signup', email });
      if (failure) throw failure;
      setMessage(t('verification_sent') || 'Verification code sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The code could not be sent.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFrame
      title={t('verify_email') || 'Verify your email'}
      subtitle={email ? `We sent a 6-digit code to ${email}.` : 'Enter the 6-digit code from your email.'}
      footer={<Link href="/login">{t('back_to_login') || 'Back to login'}</Link>}
    >
      <Form onSubmit={verify}>
        <PinInput length={CODE_LENGTH} value={otp} onChange={setOtp} loading={verifying} error={Boolean(error)} classNames={{ container: styles.pins, input: styles.pin }} inputProps={{ 'aria-label': 'Verification code' }} />
        {error && <FormError>{error}</FormError>}
        {message && <FormNotice>{message}</FormNotice>}
        <Button type="submit" full busy={verifying} disabled={!email || otp.length !== CODE_LENGTH}>{t('verify') || 'Verify'}</Button>
        <Button variant="secondary" full busy={resending} onClick={resend}>{t('resend') || 'Resend code'}</Button>
      </Form>
    </AuthFrame>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VerificationForm />
    </Suspense>
  );
}
