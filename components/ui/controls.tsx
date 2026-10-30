'use client';

import { useId, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { SelectField, TextInput } from '@academix-admin/forms';
import { SelectionViewer, useSelectionController } from '@academix-admin/selection-viewer';
import { ChevronIcon } from './icons';
import { OVERLAY_Z, SHEET_LAYOUT } from './theme';
import styles from './ui.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  full?: boolean;
  busy?: boolean;
};

/**
 * Fills a form once, when its record first arrives. Once only: a background refresh of the record
 * must never overwrite what someone is typing.
 */
export function useSeed<T>(source: T | null | undefined, apply: (source: T) => void) {
  const [seeded, setSeeded] = useState(false);
  if (source && !seeded) {
    setSeeded(true);
    apply(source);
  }
}

export function Button({ variant = 'primary', full = false, busy = false, children, disabled, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || busy} className={`${styles.button} ${className ?? ''}`} data-variant={variant} data-full={full || undefined}>
      {busy && <span className={styles.buttonSpinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Fields stacked with even spacing; `onSubmit` makes it a form, Enter included. */
export function Form({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.fieldRow}>{children}</div>;
}

type TextFieldProps = Omit<ComponentProps<typeof TextInput>, 'classNames' | 'className' | 'onChange'> & { onChange: (value: string) => void };

/** academix-ui's TextInput in the app's look. Its wrapper exists only when there's an adornment. */
export function TextField({ onChange, ...rest }: TextFieldProps) {
  const adorned = Boolean(rest.prefix || rest.suffix || rest.secureToggle);
  return (
    <TextInput
      {...rest}
      onChange={(value) => onChange(value)}
      classNames={{
        root: styles.field,
        label: styles.label,
        field: styles.adorned,
        input: adorned ? styles.inputBare : styles.input,
        prefix: styles.prefix,
        suffix: styles.prefix,
        toggle: styles.toggle,
        helper: styles.helper,
      }}
    />
  );
}

export function DateField({ label, value, onChange, required, max }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; max?: string }) {
  return <TextField type="date" label={label} value={value} onChange={onChange} required={required} inputProps={{ max }} />;
}

/** An amount in naira. The keyboard offers digits, and anything else typed is dropped. */
export function MoneyField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <TextField
      label={label}
      prefix="₦"
      keyboardType="decimal"
      value={value}
      required={required}
      hint="0"
      onChange={(next) => onChange(next.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
    />
  );
}

export function TextArea({ label, value, onChange, rows = 3, required, hint }: { label: string; value: string; onChange: (value: string) => void; rows?: number; required?: boolean; hint?: string }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <textarea id={id} className={styles.input} value={value} rows={rows} required={required} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export type Option = { value: string; label: string; hint?: string };

/** Pick one from a list in a sheet: academix-ui's SelectField opening its SelectionViewer. */
export function PickerField({ label, value, options, onChange, placeholder = 'Choose', searchable = false, required }: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  required?: boolean;
}) {
  const [id, controller, isOpen] = useSelectionController();
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <>
      <SelectField
        label={label}
        value={selected?.label}
        placeholder={placeholder}
        onOpen={() => controller.open()}
        trailing={<span className={styles.pickerChevron}><ChevronIcon size="18px" /></span>}
        classNames={{ root: styles.field, label: styles.label, control: styles.pickerControl }}
      />
      {/* Keeps the browser's own "fill this in" check for a required choice. */}
      {required && <input className={styles.visuallyRequired} tabIndex={-1} aria-hidden="true" value={value} required onChange={() => {}} />}
      <SelectionViewer
        id={id}
        isOpen={isOpen}
        onClose={controller.close}
        titleProp={{ text: label, textColor: 'var(--color-text)' }}
        searchProp={searchable ? { text: 'Search', textColor: 'var(--color-text)', onChange: setQuery } : undefined}
        selectionState={shown.length ? 'data' : 'empty'}
        noResultProp={{ view: <p className={styles.pickerEmpty}>No matches</p> }}
        layoutProp={SHEET_LAYOUT}
        childrenDirection="vertical"
        zIndex={OVERLAY_Z}
        ariaLabel={label}
        historyRoute={`picker-${id}`}
      >
        {shown.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.pickerRow}
            data-selected={option.value === value || undefined}
            onClick={() => {
              onChange(option.value);
              controller.close();
            }}
          >
            <span>{option.label}</span>
            {option.hint && <small>{option.hint}</small>}
          </button>
        ))}
      </SelectionViewer>
    </>
  );
}

/** Two to four short choices, all visible: quicker on a phone than opening a sheet. */
export function Segmented({ label, value, options, onChange }: { label?: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option.value} type="button" role="radio" aria-checked={option.value === value} className={styles.segment} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A sideways row of filters. navigation-stack's useRevealTappedInRows keeps the tapped one in view. */
export function FilterBar({ value, options, onChange }: { value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <div className={styles.filters}>
      {options.map((option) => (
        <button key={option.value} type="button" className={styles.filter} aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={styles.toggleRow}>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
