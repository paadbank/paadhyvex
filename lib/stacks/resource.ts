'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDemandResource } from '@academix-admin/state-stack';

/**
 * The one way a screen reads something (store-manager's useResource). The value is `null` until the
 * first answer, so a screen shows a loader rather than a made-up 0. It is persisted, so the last
 * answer shows at once and a fresh read replaces it behind the scenes. A failed read keeps what is
 * on screen and sets only `error`; Try again is `reload()`.
 *
 * `key` names the value (include every id it depends on). `scope` is what a writer invalidates.
 */
export interface Resource<T> {
  data: T | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useResource<T>(opts: {
  key: string;
  scope: string;
  read: () => Promise<T>;
  deps?: readonly unknown[];
  enabled?: boolean;
}): Resource<T> {
  const { key, scope, enabled = true } = opts;
  const readRef = useRef(opts.read);
  useEffect(() => {
    readRef.current = opts.read;
  });

  const res = useDemandResource<T>(() => readRef.current(), {
    key,
    scope,
    enabled,
    persist: true,
    deps: opts.deps ? [...opts.deps] : [],
    fallbackMessage: 'Check your connection and try again.',
  });

  const reload = useCallback(() => {
    void res.refetch();
  }, [res]);

  return { data: res.data, loaded: res.loaded, loading: res.loading, error: res.error, reload };
}
