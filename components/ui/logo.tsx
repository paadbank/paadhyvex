import styles from './logo.module.css';

/** The name as the logo sets it: PAADHY in black serif, VEX in red grotesque. */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={styles.wordmark} data-size={size} aria-label="PAADhyvex">
      <span aria-hidden="true">PAADHY</span>
      <span aria-hidden="true" className={styles.vex}>VEX</span>
    </span>
  );
}

export function Mark({ size = 32 }: { size?: number }) {
  return <img src="/paadhyvex_mark.svg" alt="" width={size} height={size} />;
}
