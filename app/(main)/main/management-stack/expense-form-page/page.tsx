'use client';

import { useState } from 'react';
import { useLocation, useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useExpenses, useRole, useUserId } from '@/lib/stacks/data';
import { PageScaffold } from '@/components/ui/page';
import { useSeed, Button, DateField, FieldRow, Form, MoneyField, PickerField, TextArea } from '@/components/ui/controls';
import { DeleteRecord, useSubmit } from '@/components/ui/dialogs';

const EMPTY = { category: 'purchases', amount_given: '', amount_spent: '', date_of_allocation: '', date_of_expenditure: '', notes: '' };

const CATEGORIES = [
  { value: 'purchases', label: 'Pad purchases' },
  { value: 'distribution', label: 'Distribution costs' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'others', label: 'Others', hint: 'Supplies, fuel and so on' },
];

/** New and edit, for Expenses and for the sales team's Transactions: the same record. */
export default function ExpenseFormPage() {
  const nav = useNav();
  const id = useLocation()?.params?.id as string | undefined;
  const userId = useUserId();
  const role = useRole();
  const expenses = useExpenses();
  const existing = id ? expenses.data?.find((e) => e.id === id) : undefined;
  const [values, setValues] = useState(EMPTY);
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof EMPTY>) => setValues((v) => ({ ...v, ...patch }));

  useSeed(existing, (existing) => {
    setValues({
      category: existing.category,
      amount_given: String(existing.amount_given),
      amount_spent: String(existing.amount_spent),
      date_of_allocation: existing.date_of_allocation,
      date_of_expenditure: existing.date_of_expenditure ?? '',
      notes: existing.notes ?? '',
    });
  });

  const save = () =>
    submit(async () => {
      const row = {
        category: values.category,
        amount_given: parseFloat(values.amount_given),
        amount_spent: parseFloat(values.amount_spent),
        date_of_allocation: values.date_of_allocation,
        date_of_expenditure: values.date_of_expenditure || null,
        notes: values.notes || null,
        recorded_by: userId,
      };
      if (id) must(await supabaseBrowser.from('expense_records').update(row).eq('id', id));
      else must(await supabaseBrowser.from('expense_records').insert({ ...row, source: 'manual' }));
      changed('expenses');
      await nav.pop();
    });

  return (
    <PageScaffold title={id ? 'Edit expense' : 'New expense'}>
      <Form onSubmit={save}>
        <PickerField label="Category" value={values.category} options={CATEGORIES} onChange={(category) => set({ category })} />
        <FieldRow>
          <MoneyField label="Amount given" value={values.amount_given} onChange={(amount_given) => set({ amount_given })} required />
          <MoneyField label="Amount spent" value={values.amount_spent} onChange={(amount_spent) => set({ amount_spent })} required />
        </FieldRow>
        <FieldRow>
          <DateField label="Date allocated" value={values.date_of_allocation} onChange={(date_of_allocation) => set({ date_of_allocation })} required />
          <DateField label="Date spent" value={values.date_of_expenditure} onChange={(date_of_expenditure) => set({ date_of_expenditure })} />
        </FieldRow>
        <TextArea label="Notes" rows={2} value={values.notes} onChange={(notes) => set({ notes })} />
        <Button type="submit" full busy={busy}>{id ? 'Save changes' : 'Create expense'}</Button>
      </Form>
      {id && role === 'admin' && (
        <DeleteRecord
          what="expense"
          message="It will no longer count toward your totals."
          onDelete={async () => {
            must(await supabaseBrowser.from('expense_records').delete().eq('id', id));
            changed('expenses');
            await nav.pop();
          }}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
