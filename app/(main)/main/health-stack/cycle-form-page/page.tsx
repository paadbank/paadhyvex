'use client';

import { useState } from 'react';
import { useLocation, useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useMyCycles, useUserId } from '@/lib/stacks/data';
import { CycleFields, EMPTY_CYCLE, cycleRow, type CycleValues } from '@/components/health/cycle-fields';
import { PageScaffold } from '@/components/ui/page';
import { useSeed, Button, Form } from '@/components/ui/controls';
import { DeleteRecord, useSubmit } from '@/components/ui/dialogs';

export default function CycleFormPage() {
  const nav = useNav();
  const id = useLocation()?.params?.id as string | undefined;
  const userId = useUserId();
  const cycles = useMyCycles();
  const existing = id ? cycles.data?.find((c) => c.id === id) : undefined;
  const [values, setValues] = useState<CycleValues>(EMPTY_CYCLE);
  const { busy, submit, dialog } = useSubmit();

  useSeed(existing, (existing) => {
    setValues({
      start_date: existing.start_date,
      end_date: existing.end_date ?? '',
      flow_intensity: existing.flow_intensity ?? 'moderate',
      mood: existing.mood ?? '',
      feelings: existing.feelings ?? '',
      notes: existing.notes ?? '',
    });
  });

  const save = () =>
    submit(async () => {
      const row = cycleRow(values);
      if (id) must(await supabaseBrowser.from('cycle_logs').update(row).eq('id', id));
      else must(await supabaseBrowser.from('cycle_logs').insert({ ...row, beneficiary_id: userId }));
      changed('cycles');
      await nav.pop();
    });

  return (
    <PageScaffold title={id ? 'Edit cycle log' : 'Log a period'}>
      <Form onSubmit={save}>
        <CycleFields values={values} onChange={setValues} feelingsHint="How are you feeling?" />
        <Button type="submit" full busy={busy}>{id ? 'Save changes' : 'Save log'}</Button>
      </Form>
      {id && (
        <DeleteRecord
          what="cycle log"
          message="This removes it from your history."
          onDelete={async () => {
            must(await supabaseBrowser.from('cycle_logs').delete().eq('id', id));
            changed('cycles');
            await nav.pop();
          }}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
