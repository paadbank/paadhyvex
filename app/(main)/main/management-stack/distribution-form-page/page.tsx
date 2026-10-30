'use client';

import { useState } from 'react';
import { useLocation, useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useBeneficiaries, useDistributions, useRole, useUserId } from '@/lib/stacks/data';
import { PageScaffold } from '@/components/ui/page';
import { useSeed, Button, DateField, FieldRow, Form, MoneyField, PickerField, Segmented, TextArea, TextField } from '@/components/ui/controls';
import { DeleteRecord, useSubmit } from '@/components/ui/dialogs';

const EMPTY = { beneficiary_id: '', distribution_date: '', num_pads: '', transport_mode: 'pickup', delivery_address: '', delivery_cost: '', notes: '' };

const MODES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'dispatch', label: 'Dispatch' },
];

export default function DistributionFormPage() {
  const nav = useNav();
  const id = useLocation()?.params?.id as string | undefined;
  const userId = useUserId();
  const role = useRole();
  const beneficiaries = useBeneficiaries();
  const distributions = useDistributions();
  const existing = id ? distributions.data?.find((d) => d.id === id) : undefined;
  const [values, setValues] = useState(EMPTY);
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof EMPTY>) => setValues((v) => ({ ...v, ...patch }));

  useSeed(existing, (existing) => {
    setValues({
      beneficiary_id: existing.beneficiary_id,
      distribution_date: existing.distribution_date,
      num_pads: String(existing.num_pads),
      transport_mode: existing.transport_mode,
      delivery_address: existing.delivery_address ?? '',
      delivery_cost: String(existing.delivery_cost ?? ''),
      notes: existing.notes ?? '',
    });
  });

  const save = () =>
    submit(async () => {
      const row = { ...values, num_pads: parseInt(values.num_pads, 10), delivery_cost: parseFloat(values.delivery_cost) || 0, distributor_id: userId };
      if (id) must(await supabaseBrowser.from('distributions').update(row).eq('id', id));
      else must(await supabaseBrowser.from('distributions').insert(row));
      changed('distributions');
      await nav.pop();
    });

  return (
    <PageScaffold title={id ? 'Edit distribution' : 'New distribution'}>
      <Form onSubmit={save}>
        <PickerField
          label="Beneficiary"
          value={values.beneficiary_id}
          options={(beneficiaries.data ?? []).map((b) => ({ value: b.id, label: b.full_name }))}
          onChange={(beneficiary_id) => set({ beneficiary_id })}
          placeholder="Choose a beneficiary"
          searchable
          required
        />
        <FieldRow>
          <DateField label="Distribution date" value={values.distribution_date} onChange={(distribution_date) => set({ distribution_date })} required />
          <TextField label="Number of pads" keyboardType="numeric" value={values.num_pads} required onChange={(v) => set({ num_pads: v.replace(/\D/g, '') })} />
        </FieldRow>
        <Segmented label="How it reaches them" value={values.transport_mode} options={MODES} onChange={(transport_mode) => set({ transport_mode })} />
        {values.transport_mode === 'dispatch' && <TextArea label="Delivery address" rows={2} value={values.delivery_address} onChange={(delivery_address) => set({ delivery_address })} />}
        <MoneyField label="Delivery cost" value={values.delivery_cost} onChange={(delivery_cost) => set({ delivery_cost })} />
        <TextArea label="Notes" rows={2} value={values.notes} onChange={(notes) => set({ notes })} />
        <Button type="submit" full busy={busy}>{id ? 'Save changes' : 'Create distribution'}</Button>
      </Form>
      {id && role === 'admin' && (
        <DeleteRecord
          what="distribution"
          message="Its record and delivery cost will be removed."
          onDelete={async () => {
            must(await supabaseBrowser.from('distributions').delete().eq('id', id));
            changed('distributions');
            await nav.pop();
          }}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
