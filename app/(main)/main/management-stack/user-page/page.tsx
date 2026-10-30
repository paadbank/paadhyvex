'use client';

import { useState } from 'react';
import { useLocation, useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { accessToken, changed, must, useRole, useUsers } from '@/lib/stacks/data';
import { label, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Badge, Columns, Facts, Identity, Section } from '@/components/ui/display';
import { Button, FieldRow, Form, PickerField, TextField } from '@/components/ui/controls';
import { ConfirmDialog, ProblemDialog, useSubmit } from '@/components/ui/dialogs';
import { updateUserPassword } from '../admin-page/actions/updatePassword';
import { ROLE_OPTIONS } from '../user-form-page/roles';

export default function UserPage() {
  const nav = useNav();
  const id = useLocation()?.params?.id as string | undefined;
  const myRole = useRole();
  const users = useUsers();
  const user = users.data?.find((u) => u.id === id);
  const [newRole, setNewRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const { busy, submit, dialog } = useSubmit();

  const canManage = myRole === 'manager' || myRole === 'admin';
  const isAdmin = myRole === 'admin';

  const update = (patch: Record<string, string>) =>
    submit(async () => {
      must(await supabaseBrowser.from('profiles').update(patch).eq('id', id!));
      changed('people');
      setNewRole(null);
    });

  const remove = () =>
    submit(async () => {
      must(await supabaseBrowser.from('profiles').delete().eq('id', id!));
      changed('people');
      setDeleting(false);
      await nav.pop();
    });

  const resetPassword = () =>
    submit(async () => {
      const result = await updateUserPassword(await accessToken(), id!, password);
      if (result.error) throw new Error(result.error);
      setPassword('');
      setPasswordSaved(true);
    });

  return (
    <PageScaffold title={user?.full_name ?? 'User'}>
      <PageState status={statusOf(users, 'this user', { when: () => !user, title: 'This user no longer exists' })}>
        {() => (
          <Columns
            main={
              <>
                <Identity name={user!.full_name} detail={label(user!.role)} trailing={<Badge value={user!.status} />} />
                <Facts
                  items={[
                    ['Beneficiary code', user!.beneficiary_code],
                    ['Email', user!.beneficiary_code ? 'Managed by user' : user!.email],
                    ['Phone', user!.phone],
                    ['Location', user!.location],
                    ['Occupation', user!.occupation],
                    ['Joined', shortDate(user!.created_at)],
                  ]}
                />
                {canManage && user!.status === 'pending' && (
                  <FieldRow>
                    <Button onClick={() => update({ status: 'active' })} busy={busy}>Approve</Button>
                    <Button variant="secondary" onClick={() => update({ status: 'inactive' })} disabled={busy}>Reject</Button>
                  </FieldRow>
                )}
              </>
            }
            side={
              <>
                {canManage && user!.status === 'active' && (
                  <PickerField label="Role" value={user!.role} options={ROLE_OPTIONS.filter((r) => isAdmin || r.value !== 'admin')} onChange={(role) => role !== user!.role && setNewRole(role)} />
                )}
                {isAdmin && (
                  <Section title="Reset password">
                    <Form onSubmit={resetPassword}>
                      <TextField label="New password" value={password} onChange={setPassword} hint="At least 6 characters" required inputProps={{ minLength: 6 }} />
                      <Button type="submit" variant="secondary" busy={busy}>Update password</Button>
                    </Form>
                  </Section>
                )}
                {isAdmin && <Button variant="danger" full onClick={() => setDeleting(true)}>Delete user</Button>}
              </>
            }
          />
        )}
      </PageState>

      {newRole && (
        <ConfirmDialog title="Change role?" message={`${user?.full_name} will become ${newRole}.`} confirmText="Change role" tone="primary" busy={busy} onConfirm={() => update({ role: newRole })} onCancel={() => setNewRole(null)} />
      )}
      {deleting && <ConfirmDialog title="Delete this user?" message="This can't be undone." confirmText="Delete user" busy={busy} onConfirm={remove} onCancel={() => setDeleting(false)} />}
      {passwordSaved && <ProblemDialog title="Password updated" message="Share the new password with this user." onDismiss={() => setPasswordSaved(false)} />}
      {dialog}
    </PageScaffold>
  );
}
