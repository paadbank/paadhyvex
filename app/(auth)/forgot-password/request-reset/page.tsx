'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthFrame, FormError } from '@/components/public/auth-frame';
import { Button, Form, TextField } from '@/components/ui/controls';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setSending(true);
    setError('');
    const { error: failure } = await supabaseBrowser.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/forgot-password/reset-password` });
    setSending(false);
    if (failure) setError(failure.message);
    else setSent(true);
  };

  const backToLogin = <Link href="/login">Back to login</Link>;

  if (sent) {
    return <AuthFrame title="Check your email" subtitle={`We've sent password reset instructions to ${email}.`} footer={backToLogin}>{null}</AuthFrame>;
  }

  return (
    <AuthFrame title="Reset your password" subtitle="Enter your email and we'll send you a reset link." footer={backToLogin}>
      <Form onSubmit={send}>
        <TextField label="Email" type="email" keyboardType="email" autoComplete="email" value={email} onChange={setEmail} required />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" full busy={sending}>Send reset link</Button>
      </Form>
    </AuthFrame>
  );
}
