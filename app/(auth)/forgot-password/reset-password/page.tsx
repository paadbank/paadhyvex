'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthFrame, FormError } from '@/components/public/auth-frame';
import { Button, Form, TextField } from '@/components/ui/controls';

/** Where the emailed reset link lands. The link has already signed the person in. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    const { error: failure } = await supabaseBrowser.auth.updateUser({ password });
    setSaving(false);
    if (failure) setError(failure.message);
    else router.replace('/main');
  };

  return (
    <AuthFrame title="Choose a new password">
      <Form onSubmit={save}>
        <TextField label="New password" secureToggle autoComplete="new-password" value={password} onChange={setPassword} required helperText="At least 6 characters" inputProps={{ minLength: 6 }} />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" full busy={saving}>Save password</Button>
      </Form>
    </AuthFrame>
  );
}
