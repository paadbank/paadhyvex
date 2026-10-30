/** Every amount of money on screen goes through here, so it always reads the same way. */
const NAIRA = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const NAIRA_KOBO = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function naira(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return NAIRA.format(0);
  // A true minus, so a negative amount never breaks across two lines.
  return (Number.isInteger(value) ? NAIRA : NAIRA_KOBO).format(value).replace('-', '\u2212');
}

export function count(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-NG').format(value ?? 0);
}

/** `2026-03-17`, or a timestamp, as `17 Mar 2026`. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function longDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function time(value: string): string {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function dateTime(value: string): string {
  return `${shortDate(value)}, ${time(value)}`;
}

/** Database words as people read them: `in_transit` becomes `In transit`. */
export function label(value: string | null | undefined): string {
  if (!value) return '';
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function initial(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

export function excerpt(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** Text as people typed it, for display: no stray spaces or final full stop, and no shouting. */
export function tidy(text: string | null | undefined): string {
  const clean = (text ?? '').trim().replace(/\.$/, '').trim();
  if (clean !== clean.toUpperCase()) return clean;
  return clean.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Where a piece of story media lives. Old rows hold only `link`, and Drive links can't be shown directly. */
export function mediaUrl(media: { processed_url: string | null; link: string }): string | null {
  if (media.processed_url) return media.processed_url;
  return media.link && !media.link.includes('drive.google.com') ? media.link : null;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
