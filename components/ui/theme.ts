/**
 * The academix-ui packages take their theme as props and never read the app's CSS; these hand them
 * the tokens in app/globals.css, so one place says how a sheet or a dialog looks.
 */
export const SHEET_LAYOUT = {
  backgroundColor: 'var(--color-surface)',
  handleColor: 'var(--color-border-strong)',
  handleWidth: '48px',
  maxWidth: '560px',
  contentPadding: '0 16px 24px',
} as const;

export const DIALOG_LAYOUT = {
  backgroundColor: 'var(--color-surface)',
  titleColor: 'var(--color-text)',
  messageColor: 'var(--color-text-muted)',
  primaryColor: 'var(--color-accent)',
  primaryTextColor: 'var(--color-accent-text)',
  secondaryColor: 'var(--color-surface-sunken)',
  secondaryTextColor: 'var(--color-text)',
  dangerColor: 'var(--color-accent)',
  dangerTextColor: 'var(--color-accent-text)',
  maxWidth: '400px',
  borderRadius: 'var(--radius-lg)',
  margin: '16px',
} as const;

/** Above the tab bar, which sits beside the stacks. */
export const OVERLAY_Z = 1000;
