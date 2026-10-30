'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import Header from '@academix-admin/header';
import { Scaffold, useNav, useNavTitle } from '@academix-admin/navigation-stack';
import { useTheme } from '@/context/ThemeContext';
import type { Resource } from '@/lib/stacks/resource';
import { Button } from './controls';
import { AlertIcon, BackChevronIcon } from './icons';
import styles from './ui.module.css';

/** A back handler, `undefined` on a tab's first page (store-manager's useStackBack). */
export function useStackBack(): (() => void) | undefined {
  const nav = useNav();
  const subscribe = useCallback((onChange: () => void) => nav.subscribe(() => onChange()), [nav]);
  const depth = useSyncExternalStore(subscribe, () => nav.getStack().length, () => 1);
  return depth > 1 ? () => void nav.pop() : undefined;
}

type Action = { icon: ReactNode; onClick: () => void; ariaLabel: string; loading?: boolean; disabled?: boolean; badge?: ReactNode };

/**
 * The frame every page in a navigation stack uses: academix-ui's Header over navigation-stack's
 * Scaffold, which owns the one scrolling container. A tab's first page takes the large serif title;
 * a pushed page takes a compact one beside its back arrow.
 */
export function PageScaffold({
  title,
  subtitle,
  actions,
  trailing,
  bottomBar,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: Action[];
  /** Something beside the actions, such as the signed-in person's avatar. */
  trailing?: ReactNode;
  bottomBar?: ReactNode;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const onBack = useStackBack();
  useNavTitle(typeof title === 'string' ? title : null);
  return (
    <Scaffold
      appBar={
        <Header
          variant="title"
          position="static"
          theme={theme}
          title={title}
          description={subtitle}
          onBack={onBack}
          backAriaLabel="Go back"
          backIcon={<BackChevronIcon size="24px" />}
          actions={actions}
          rightContent={trailing}
          classNames={{
            root: styles.header,
            content: styles.headerContent,
            title: onBack ? styles.headerTitle : styles.headerTitleLarge,
            description: styles.headerSubtitle,
            backButton: styles.headerButton,
            action: styles.headerButton,
            badge: styles.headerBadge,
          }}
        />
      }
      appBarBehavior="pinned"
      bodyClassName={styles.body}
      bottomBar={bottomBar}
    >
      <div className={styles.inner}>{children}</div>
    </Scaffold>
  );
}

export type PageStatus =
  | { state: 'ready' }
  | { state: 'loading' }
  | { state: 'error'; what: string; error?: string | null; onRetry?: () => void }
  | { state: 'empty'; title: string; body?: ReactNode; action?: ReactNode };

/** A page's body: data, else loading, else what went wrong, else empty. The header stays put. */
export function statusOf<T>(res: Resource<T>, what: string, empty?: { when: (data: T) => boolean; title: string; body?: ReactNode; action?: ReactNode }): PageStatus {
  if (!res.loaded || res.data === null) {
    return res.error ? { state: 'error', what, error: res.error, onRetry: res.reload } : { state: 'loading' };
  }
  if (empty?.when(res.data)) return { state: 'empty', title: empty.title, body: empty.body, action: empty.action };
  return { state: 'ready' };
}

export function PageState({ status, children }: { status: PageStatus; children: () => ReactNode }) {
  switch (status.state) {
    case 'loading':
      return <Loading />;
    case 'error':
      return (
        <div className={styles.message} role="alert">
          <span className={styles.messageIcon}><AlertIcon size="28px" /></span>
          <h2>Could not load {status.what}</h2>
          {status.error && <p>{status.error}</p>}
          {status.onRetry && <Button variant="secondary" onClick={status.onRetry}>Try again</Button>}
        </div>
      );
    case 'empty':
      return (
        <div className={styles.message}>
          <h2>{status.title}</h2>
          {status.body && <p>{status.body}</p>}
          {status.action}
        </div>
      );
    default:
      return <>{children()}</>;
  }
}

export function Loading() {
  return (
    <div className={styles.loading} role="status" aria-label="Loading">
      <span className={styles.spinner} />
    </div>
  );
}

/** Stays in reach while the page scrolls under it. */
export function PinnedSection({ children }: { children: ReactNode }) {
  return <div className={styles.pinned}>{children}</div>;
}

const tabHiders = new Set<symbol>();
const tabListeners = new Set<() => void>();

/** A page that owns the foot of the screen (a chat's message box) hides the tab bar while mounted. */
export function useHideTabBar() {
  useEffect(() => {
    const token = Symbol('hide-tabs');
    tabHiders.add(token);
    tabListeners.forEach((l) => l());
    return () => {
      tabHiders.delete(token);
      tabListeners.forEach((l) => l());
    };
  }, []);
}

export function useTabBarHidden(): boolean {
  return useSyncExternalStore(
    (l) => {
      tabListeners.add(l);
      return () => tabListeners.delete(l);
    },
    () => tabHiders.size > 0,
    () => false,
  );
}
