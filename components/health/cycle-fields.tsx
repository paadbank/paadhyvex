'use client';

import { DateField, PickerField, Segmented, TextArea, FieldRow } from '@/components/ui/controls';

export type CycleValues = { start_date: string; end_date: string; flow_intensity: string; mood: string; feelings: string; notes: string };

export const EMPTY_CYCLE: CycleValues = { start_date: '', end_date: '', flow_intensity: 'moderate', mood: '', feelings: '', notes: '' };

const FLOW = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
];

const MOODS = ['happy', 'normal', 'sad', 'anxious', 'irritable', 'tired'].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));

/** A row for `cycle_logs`. An end date closes the cycle; empty fields are stored as nothing. */
export function cycleRow(values: CycleValues) {
  return {
    start_date: values.start_date,
    end_date: values.end_date || null,
    flow_intensity: values.flow_intensity,
    mood: values.mood || null,
    feelings: values.feelings || null,
    notes: values.notes || null,
    status: values.end_date ? 'closed' : 'open',
  };
}

/** The fields a beneficiary and a logger both fill in. */
export function CycleFields({ values, onChange, feelingsHint }: { values: CycleValues; onChange: (values: CycleValues) => void; feelingsHint: string }) {
  const set = (patch: Partial<CycleValues>) => onChange({ ...values, ...patch });
  return (
    <>
      <FieldRow>
        <DateField label="Start date" value={values.start_date} onChange={(start_date) => set({ start_date })} required />
        <DateField label="End date" value={values.end_date} onChange={(end_date) => set({ end_date })} />
      </FieldRow>
      <Segmented label="Flow" value={values.flow_intensity} options={FLOW} onChange={(flow_intensity) => set({ flow_intensity })} />
      <PickerField label="Mood" value={values.mood} options={MOODS} onChange={(mood) => set({ mood })} placeholder="Choose a mood" />
      <TextArea label="Feelings" value={values.feelings} onChange={(feelings) => set({ feelings })} rows={2} hint={feelingsHint} />
      <TextArea label="Notes" value={values.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}
