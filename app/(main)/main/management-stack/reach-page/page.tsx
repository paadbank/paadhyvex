'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { saveGirlsToReach, useGirlsToReach } from '@/lib/reach';
import { count } from '@/lib/format';
import { PageScaffold } from '@/components/ui/page';
import { Button, Form, TextField, useSeed } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';

export default function ReachPage() {
  const nav = useNav();
  const current = useGirlsToReach();
  const [value, setValue] = useState('');
  const { busy, submit, dialog } = useSubmit();

  useSeed(current === null ? null : { current }, (seed) => setValue(String(seed.current)));

  const save = () =>
    submit(async () => {
      await saveGirlsToReach(parseInt(value, 10));
      await nav.pop();
    });

  return (
    <PageScaffold title="Girls yet to reach" subtitle={current === null ? 'No figure set yet' : `Now showing ${count(current)}`}>
      <Form onSubmit={save}>
        <TextField
          label="Number of girls"
          keyboardType="numeric"
          value={value}
          required
          helperText="This is the X in PAADHYVEX. It updates on the public site as soon as you save."
          onChange={(next) => setValue(next.replace(/\D/g, ''))}
        />
        <Button type="submit" full busy={busy}>Save figure</Button>
      </Form>
      {dialog}
    </PageScaffold>
  );
}
