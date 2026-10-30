'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useBeneficiaries } from '@/lib/stacks/data';
import { CycleFields, EMPTY_CYCLE, cycleRow } from '@/components/health/cycle-fields';
import { PageScaffold } from '@/components/ui/page';
import { Button, Form, PickerField } from '@/components/ui/controls';
import { ProblemDialog, useSubmit } from '@/components/ui/dialogs';

export default function LogCyclePage() {
  const beneficiaries = useBeneficiaries();
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [values, setValues] = useState(EMPTY_CYCLE);
  const [logged, setLogged] = useState(false);
  const { busy, submit, dialog } = useSubmit();

  const save = () =>
    submit(async () => {
      must(await supabaseBrowser.from('cycle_logs').insert({ ...cycleRow(values), beneficiary_id: beneficiaryId }));
      changed('cycles');
      setBeneficiaryId('');
      setValues(EMPTY_CYCLE);
      setLogged(true);
    });

  return (
    <PageScaffold title="Log a cycle">
      <Form onSubmit={save}>
        <PickerField
          label="Beneficiary"
          value={beneficiaryId}
          options={(beneficiaries.data ?? []).map((b) => ({ value: b.id, label: b.full_name }))}
          onChange={setBeneficiaryId}
          placeholder="Choose a beneficiary"
          searchable
          required
        />
        <CycleFields values={values} onChange={setValues} feelingsHint="How is the beneficiary feeling?" />
        <Button type="submit" full busy={busy}>Log cycle</Button>
      </Form>
      {logged && <ProblemDialog title="Cycle logged" message="You can log another one now." onDismiss={() => setLogged(false)} />}
      {dialog}
    </PageScaffold>
  );
}
