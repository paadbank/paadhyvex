'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { accessToken, changed, useRole } from '@/lib/stacks/data';
import { PageScaffold } from '@/components/ui/page';
import { Button, Form, PickerField, TextField } from '@/components/ui/controls';
import { ConfirmDialog, useSubmit } from '@/components/ui/dialogs';
import { createUserWithId } from '../admin-page/actions/createUser';
import { ROLE_OPTIONS } from './roles';

const EMPTY = { full_name: '', password: '', role: 'beneficiary', phone: '', location: '' };

export default function UserFormPage() {
  const nav = useNav();
  const myRole = useRole();
  const [values, setValues] = useState(EMPTY);
  const [created, setCreated] = useState<{ code: string; password: string } | null>(null);
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof EMPTY>) => setValues((v) => ({ ...v, ...patch }));

  const save = () =>
    submit(async () => {
      const result = await createUserWithId(await accessToken(), values);
      if ('error' in result) throw new Error(result.error);
      changed('people');
      setCreated({ code: result.beneficiaryCode, password: values.password });
    });

  return (
    <PageScaffold title="Create user">
      <Form onSubmit={save}>
        <TextField label="Full name" value={values.full_name} onChange={(full_name) => set({ full_name })} required />
        <TextField label="Password" value={values.password} onChange={(password) => set({ password })} hint="At least 6 characters" required inputProps={{ minLength: 6 }} />
        <PickerField label="Role" value={values.role} options={ROLE_OPTIONS.filter((r) => myRole === 'admin' || r.value !== 'admin')} onChange={(role) => set({ role })} />
        <TextField label="Phone" type="tel" keyboardType="tel" value={values.phone} onChange={(phone) => set({ phone })} />
        <TextField label="Location" value={values.location} onChange={(location) => set({ location })} />
        <Button type="submit" full busy={busy}>Create user</Button>
      </Form>
      {created && (
        <ConfirmDialog
          title="User created"
          message={`Beneficiary code: ${created.code}. Password: ${created.password}. Share these with the user now; the password won't be shown again.`}
          confirmText="Done"
          cancelText="Create another"
          tone="primary"
          onConfirm={() => void nav.pop()}
          onCancel={() => {
            setCreated(null);
            setValues(EMPTY);
          }}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
