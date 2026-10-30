'use client';

import { useCallback, useState } from 'react';
import { Button } from './controls';
import { DialogViewer } from '@academix-admin/dialog-viewer';
import { DIALOG_LAYOUT, OVERLAY_Z } from './theme';

/** Mount only while there is a problem to show: a failure the person must see and dismiss. */
export function ProblemDialog({ title = 'That did not work', message, onDismiss }: { title?: string; message: string; onDismiss: () => void }) {
  return (
    <DialogViewer
      isOpen
      onClose={onDismiss}
      title={title}
      message={message}
      showCancel={false}
      closeOnBackdrop
      zIndex={OVERLAY_Z + 100}
      historyRoute="problem"
      buttons={[{ text: 'OK', variant: 'primary', onClick: onDismiss }]}
      layoutProp={DIALOG_LAYOUT}
    />
  );
}

/** Mount only while the question is being asked. */
export function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogViewer
      isOpen
      onClose={onCancel}
      title={title}
      message={message}
      showCancel={false}
      closeOnBackdrop={!busy}
      zIndex={OVERLAY_Z + 100}
      historyRoute="confirm"
      buttons={[
        { text: cancelText, variant: 'secondary', disabled: busy, onClick: onCancel },
        { text: confirmText, variant: tone, loading: busy, onClick: onConfirm },
      ]}
      layoutProp={DIALOG_LAYOUT}
    />
  );
}

/** The way to remove a record, kept on its own edit page and always confirmed. */
export function DeleteRecord({ what, message, onDelete }: { what: string; message: string; onDelete: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const { busy, submit, dialog } = useSubmit();
  return (
    <>
      <Button variant="danger" full onClick={() => setAsking(true)}>Delete {what}</Button>
      {asking && <ConfirmDialog title={`Delete this ${what}?`} message={message} confirmText="Delete" busy={busy} onConfirm={() => submit(onDelete)} onCancel={() => setAsking(false)} />}
      {dialog}
    </>
  );
}

/** Runs a save: `busy` while it runs, and any failure in a dialog instead of a console line. */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const dialog = problem ? <ProblemDialog message={problem} onDismiss={() => setProblem(null)} /> : null;
  return { busy, submit, dialog };
}
