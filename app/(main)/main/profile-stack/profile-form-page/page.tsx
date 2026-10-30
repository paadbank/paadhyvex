'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useProfile } from '@/lib/stacks/data';
import { today } from '@/lib/format';
import { PageScaffold } from '@/components/ui/page';
import { useSeed, Button, DateField, Form, TextField } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';

export default function ProfileFormPage() {
  const nav = useNav();
  const { t } = useLanguage();
  const profile = useProfile();
  const [values, setValues] = useState({ full_name: '', phone: '', location: '', occupation: '', date_of_birth: '' });
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const p = profile.data;

  useSeed(p, (p) => {
    setValues({ full_name: p.full_name ?? '', phone: p.phone ?? '', location: p.location ?? '', occupation: p.occupation ?? '', date_of_birth: p.date_of_birth ?? '' });
  });

  const save = () =>
    submit(async () => {
      must(await supabaseBrowser.from('profiles').update({ ...values, date_of_birth: values.date_of_birth || null }).eq('id', p!.id));
      changed('profile');
      await nav.pop();
    });

  return (
    <PageScaffold title="Edit profile">
      <Form onSubmit={save}>
        <TextField label={t('full_name') || 'Full name'} value={values.full_name} onChange={(full_name) => set({ full_name })} required />
        <TextField label={t('phone') || 'Phone'} type="tel" keyboardType="tel" value={values.phone} onChange={(phone) => set({ phone })} />
        <TextField label={t('location') || 'Location'} value={values.location} onChange={(location) => set({ location })} />
        <TextField label={t('occupation') || 'Occupation'} value={values.occupation} onChange={(occupation) => set({ occupation })} />
        <DateField label={t('date_of_birth') || 'Date of birth'} value={values.date_of_birth} onChange={(date_of_birth) => set({ date_of_birth })} max={today()} />
        <Button type="submit" full busy={busy} disabled={!p}>{t('save') || 'Save changes'}</Button>
      </Form>
      {dialog}
    </PageScaffold>
  );
}
