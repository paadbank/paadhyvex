'use client';

/**
 * state-stack.tsx
 * Production-ready cross-tab state management for Next.js.
 *
 * Key guarantees:
 *  - BroadcastChannel cross-tab sync with self-message suppression (tabId guard).
 *  - IndexedDB-first storage with localStorage fallback.
 *  - Per-key promise-chain update serialisation — no concurrent updates dropped.
 *  - Undo/redo works for both persistent and non-persistent state.
 *  - useSyncExternalStore for React 18 concurrent-mode safety.
 *  - config.initial stabilised via useRef to prevent dependency-loop re-renders.
 *  - Dev warning when usePathname() returns null (prevents silent scope collisions).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const DEBUG = process.env.NODE_ENV === 'development';
const INTERNAL_SEPARATOR = '::';
const BROADCAST_CHANNEL_NAME = 'state-stack-sync';

type Subscriber = () => void;

// ---------------------------------------------------------------------------
// StorageAdapter interface
// ---------------------------------------------------------------------------

/**
 * StorageAdapter abstracts persistence. All methods return Promise for
 * uniformity even if the implementation is synchronous (localStorage).
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
  getAllKeys?(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// IndexedDB adapter
// ---------------------------------------------------------------------------

class IndexedDBAdapter implements StorageAdapter {
  private readonly dbName = 'StateStackDB';
  private readonly storeName = 'state';
  private readonly version = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    const db = await this.init();
    return db.transaction([this.storeName], mode).objectStore(this.storeName);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const store = await this.getStore();
      return new Promise<string | null>((resolve, reject) => {
        const req = store.get(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result ?? null);
      });
    } catch (err) {
      console.warn('[IndexedDBAdapter] getItem failed:', err);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise<void>((resolve, reject) => {
        const req = store.put(value, key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error('[IndexedDBAdapter] setItem failed:', err);
      throw err;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise<void>((resolve, reject) => {
        const req = store.delete(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error('[IndexedDBAdapter] removeItem failed:', err);
      throw err;
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise<void>((resolve, reject) => {
        const req = store.clear();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error('[IndexedDBAdapter] clear failed:', err);
      throw err;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const store = await this.getStore();
      return new Promise<string[]>((resolve, reject) => {
        const req = store.getAllKeys();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result as string[]);
      });
    } catch (err) {
      console.error('[IndexedDBAdapter] getAllKeys failed:', err);
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// localStorage adapter
// ---------------------------------------------------------------------------

const browserStorageAdapter: StorageAdapter = {
  getItem: async (k) =>
    typeof window !== 'undefined'
      ? Promise.resolve(localStorage.getItem(k))
      : Promise.resolve(null),

  setItem: async (k, v) => {
    if (typeof window !== 'undefined') localStorage.setItem(k, v);
  },

  removeItem: async (k) => {
    if (typeof window !== 'undefined') localStorage.removeItem(k);
  },

  clear: async () => {
    if (typeof window !== 'undefined') localStorage.clear();
  },

  getAllKeys: async () =>
    typeof window !== 'undefined' ? Object.keys(localStorage) : [],
};

// ---------------------------------------------------------------------------
// No-op fallback adapter
// ---------------------------------------------------------------------------

export const fallbackStorageAdapter: StorageAdapter = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
};

// ---------------------------------------------------------------------------
// Singleton adapter instances
// ---------------------------------------------------------------------------

const indexedDBAdapter = new IndexedDBAdapter();

/**
 * Smart default: IndexedDB first, localStorage fallback.
 * removeItem/clear/getAllKeys operate on both to stay consistent.
 */
export const defaultStorageAdapter: StorageAdapter = {
  getItem: async (key) => {
    try {
      return await indexedDBAdapter.getItem(key);
    } catch {
      try {
        return await browserStorageAdapter.getItem(key);
      } catch (err) {
        console.error('[StateStack] All storage adapters failed (getItem):', err);
        return null;
      }
    }
  },

  setItem: async (key, value) => {
    try {
      await indexedDBAdapter.setItem(key, value);
    } catch {
      try {
        await browserStorageAdapter.setItem(key, value);
      } catch (err) {
        console.error('[StateStack] All storage adapters failed (setItem):', err);
        throw err;
      }
    }
  },

  removeItem: async (key) => {
    await Promise.allSettled([
      indexedDBAdapter.removeItem(key),
      browserStorageAdapter.removeItem(key),
    ]);
  },

  clear: async () => {
    await Promise.allSettled([
      indexedDBAdapter.clear(),
      browserStorageAdapter.clear?.() ?? Promise.resolve(),
    ]);
  },

  getAllKeys: async () => {
    const [idbKeys, lsKeys] = await Promise.all([
      indexedDBAdapter.getAllKeys().catch(() => [] as string[]),
      browserStorageAdapter.getAllKeys?.().catch(() => [] as string[]) ??
        Promise.resolve([] as string[]),
    ]);
    return Array.from(new Set([...idbKeys, ...lsKeys]));
  },
};

// ---------------------------------------------------------------------------
// Global configuration
// ---------------------------------------------------------------------------

export interface StateStackInitOptions {
  storagePrefix?: string;
  defaultStorageAdapter?: StorageAdapter | undefined;
  debug?: boolean;
  crossTabSync?: boolean;
  preferredStorage?: 'indexeddb' | 'localstorage' | 'auto';
}

let _globalConfig: Required<StateStackInitOptions> = {
  storagePrefix: '',
  defaultStorageAdapter: defaultStorageAdapter,
  debug: DEBUG,
  crossTabSync: true,
  preferredStorage: 'auto',
};

export function initStateStack(opts: StateStackInitOptions = {}) {
  _globalConfig = { ..._globalConfig, ...opts };

  if (opts.preferredStorage === 'indexeddb') {
    _globalConfig.defaultStorageAdapter = indexedDBAdapter;
  } else if (opts.preferredStorage === 'localstorage') {
    _globalConfig.defaultStorageAdapter = browserStorageAdapter;
  }
}

export const getDefaultStorage = (): StorageAdapter =>
  _globalConfig.defaultStorageAdapter ?? defaultStorageAdapter;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function safeClone<T>(v: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(v);
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

// ---------------------------------------------------------------------------
// BroadcastMessage type (internal)
// ---------------------------------------------------------------------------

interface BroadcastMessage {
  /** Unique per-tab ID — messages from this tab are discarded on receive. */
  tabId: string;
  scope: string;
  key: string;
  /** null signals deletion */
  value: unknown;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// StateStackCore
// ---------------------------------------------------------------------------

class StateStackCore {
  // ── Singleton ─────────────────────────────────────────────────────────────

  private static _instance: StateStackCore | null = null;
  private static _listenerAttached = false;

  static get instance(): StateStackCore {
    if (!this._instance) {
      this._instance = new StateStackCore();
    }
    // Lazy attach: only call after initStateStack has had a chance to run
    if (!this._listenerAttached && _globalConfig.crossTabSync) {
      this._instance.attachStorageListener();
      this._listenerAttached = true;
    }
    return this._instance;
  }

  // ── Per-tab identity ──────────────────────────────────────────────────────
  //
  // Every BroadcastChannel message is stamped with this id.
  // The receiver drops any message whose tabId matches its own,
  // preventing the infinite loop:
  //   setState → broadcastStateChange → onmessage → setState → …

  private readonly tabId: string =
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // ── Internal state ────────────────────────────────────────────────────────

  private stacks = new Map<string, Map<string, unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private history = new Map<
    string,
    { past: unknown[]; future: unknown[]; maxDepth: number }
  >();
  private pendingUpdates = new Map<string, Promise<unknown>>();
  private scopeSubscriberCounts = new Map<string, number>();
  private autoClearScopes = new Set<string>();
  private storageEventListenerAttached = false;
  private broadcastChannel?: BroadcastChannel;
  private broadcastChannelFailed = false;

  private hydratedKeys = new Set<string>();
  private loadedKeys = new Set<string>();
  private pendingHydration = new Map<string, Promise<boolean>>();
  private hydrationSubscribers = new Map<string, Set<Subscriber>>();

  private demandedKeys = new Set<string>();
  private pendingDemandOperations = new Map<string, Promise<void>>();

  // ── Logging ───────────────────────────────────────────────────────────────

  private debugLog(...args: unknown[]) {
    // Disabled in production and reduced in development
    if (_globalConfig.debug && typeof window !== 'undefined') {
      // Only log critical events, not broadcasts
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('Broadcasted:')) {
        return; // Skip broadcast logs
      }
      console.debug('[StateStack]', ...args);
    }
  }

  // ── Key helpers ───────────────────────────────────────────────────────────

  private storageKey(scope: string, key: string): string {
    const prefix = _globalConfig.storagePrefix
      ? `${_globalConfig.storagePrefix}:`
      : '';
    return `${prefix}${scope}${INTERNAL_SEPARATOR}${key}`;
  }

  private subKey(scope: string, key: string): string {
    return `${scope}${INTERNAL_SEPARATOR}${key}`;
  }

  private parseSubKey(sk: string): [string, string] {
    const idx = sk.indexOf(INTERNAL_SEPARATOR);
    if (idx === -1) return ['', sk];
    return [sk.slice(0, idx), sk.slice(idx + INTERNAL_SEPARATOR.length)];
  }

  // ── Hydration ─────────────────────────────────────────────────────────────

  async ensureHydrated(
    scope: string,
    key: string,
    initial: unknown,
    persist: boolean,
    storage: StorageAdapter
  ): Promise<boolean> {
    const ik = this.subKey(scope, key);

    if (!persist) {
      this.hydratedKeys.add(ik);
      this.loadedKeys.add(ik);
      return false;
    }

    if (this.hydratedKeys.has(ik)) return false;

    if (this.pendingHydration.has(ik)) {
      return this.pendingHydration.get(ik)!;
    }

    const p = (async (): Promise<boolean> => {
      try {
        const sk = this.storageKey(scope, key);
        const stored = await storage.getItem(sk);

        if (stored != null) {
          try {
            const parsed = JSON.parse(stored);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(key, parsed);
            this.hydratedKeys.add(ik);
            this.loadedKeys.add(ik);
            this.notifyHydration(scope, key);
            return true;
          } catch (err) {
            console.warn('[StateStack] failed to parse persisted JSON:', err);
          }
        } else {
          // Legacy key format fallback (old separator was ":")
          const prefix = _globalConfig.storagePrefix
            ? `${_globalConfig.storagePrefix}:`
            : '';
          const legacyKey = `${prefix}${scope}:${key}`;
          try {
            const legacyStored = await storage.getItem(legacyKey);
            if (legacyStored != null) {
              const parsed = JSON.parse(legacyStored);
              if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
              this.stacks.get(scope)!.set(key, parsed);
              this.hydratedKeys.add(ik);
              this.loadedKeys.add(ik);
              this.notifyHydration(scope, key);
              return true;
            }
          } catch (err) {
            console.warn('[StateStack] legacy persist parse failed:', err);
          }
        }

        this.hydratedKeys.add(ik);
        this.loadedKeys.add(ik);
        this.notifyHydration(scope, key);
        return false;
      } catch (err) {
        console.error('[StateStack] hydrate error:', err);
        this.hydratedKeys.add(ik);
        this.loadedKeys.add(ik);
        this.notifyHydration(scope, key);
        return false;
      } finally {
        this.pendingHydration.delete(ik);
      }
    })();

    this.pendingHydration.set(ik, p);
    return p;
  }

  // ── Sync state access (useSyncExternalStore snapshot) ────────────────────

  getStateSync<S>(scope: string, key: string, initial: S): S {
    if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
    const m = this.stacks.get(scope)!;
    if (!m.has(key)) m.set(key, safeClone(initial));
    return m.get(key) as S;
  }

  // ── Async state access ────────────────────────────────────────────────────

  async getState<S>(
    scope: string,
    key: string,
    initial: S,
    persist: boolean,
    storage: StorageAdapter
  ): Promise<S> {
    const ik = this.subKey(scope, key);
    return this.queueUpdate(ik, async () => {
      await this.ensureHydrated(scope, key, initial, persist, storage);
      return this.getStateSync(scope, key, initial);
    });
  }

  // ── Update serialisation ──────────────────────────────────────────────────

  /**
   * Chains async operations per-key so concurrent calls are serialised
   * rather than deduplicated (which would silently drop updates).
   */
  private async queueUpdate<S>(
    key: string,
    fn: () => Promise<S>
  ): Promise<S> {
    const existing = this.pendingUpdates.get(key);

    const next = (async () => {
      if (existing) {
        try { await existing; } catch { /* previous error already logged */ }
      }
      return fn();
    })();

    this.pendingUpdates.set(key, next);

    try {
      return await next;
    } catch (err) {
      console.error('[StateStack] queue update error:', err);
      throw err;
    } finally {
      if (this.pendingUpdates.get(key) === next) {
        this.pendingUpdates.delete(key);
      }
    }
  }

  // ── setState ──────────────────────────────────────────────────────────────

  async setState<S>(
    scope: string,
    key: string,
    value: S,
    persist: boolean,
    storage: StorageAdapter,
    pushHistory = true
  ): Promise<S> {
    const ik = this.subKey(scope, key);

    return this.queueUpdate(ik, async () => {
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      const sm = this.stacks.get(scope)!;
      const prev = sm.get(key);

      // Mark not-hydrated during the write so concurrent reads wait.
      if (persist) this.hydratedKeys.delete(ik);

      if (persist) {
        try {
          await storage.setItem(
            this.storageKey(scope, key),
            JSON.stringify(value)
          );
          // Notify other tabs — stamps our tabId so we ignore our own echo.
          this.broadcastStateChange(scope, key, value);
        } catch (err) {
          console.error('[StateStack] persist error:', err);
        }
      }

      if (pushHistory) {
        if (!this.history.has(ik)) {
          this.history.set(ik, { past: [], future: [], maxDepth: 50 });
        }
        const h = this.history.get(ik)!;
        h.past.push(prev === undefined ? null : safeClone(prev));
        if (h.past.length > h.maxDepth) h.past.shift();
        h.future = [];
      }

      sm.set(key, safeClone(value));
      this.loadedKeys.add(ik);

      if (persist) {
        this.hydratedKeys.add(ik);
        this.notifyHydration(scope, key);
      }

      this.notify(scope, key);
      return value;
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(scope: string, key: string, fn: Subscriber): () => void {
    const k = this.subKey(scope, key);
    if (!this.subscribers.has(k)) this.subscribers.set(k, new Set());
    this.subscribers.get(k)!.add(fn);
    this.incrementScopeCount(scope);

    let unsubbed = false;
    return () => {
      if (unsubbed) return;
      unsubbed = true;
      const s = this.subscribers.get(k);
      if (s) {
        s.delete(fn);
        if (s.size === 0) this.subscribers.delete(k);
      }
      this.decrementScopeCount(scope);
    };
  }

  private incrementScopeCount(scope: string) {
    this.scopeSubscriberCounts.set(
      scope,
      (this.scopeSubscriberCounts.get(scope) ?? 0) + 1
    );
  }

  private decrementScopeCount(scope: string) {
    const next = Math.max(
      0,
      (this.scopeSubscriberCounts.get(scope) ?? 0) - 1
    );
    this.scopeSubscriberCounts.set(scope, next);
    if (next === 0 && this.autoClearScopes.has(scope)) {
      this.clearScope(scope);
      this.autoClearScopes.delete(scope);
    }
  }

  enableAutoClearOnZero(scope: string) {
    this.autoClearScopes.add(scope);
  }

  disableAutoClearOnZero(scope: string) {
    this.autoClearScopes.delete(scope);
  }

  notify(scope: string, key: string) {
    const k = this.subKey(scope, key);
    const s = this.subscribers.get(k);
    if (!s) return;
    queueMicrotask(() => {
      for (const fn of Array.from(s)) {
        try { fn(); } catch (err) {
          console.error('[StateStack] subscriber error:', err);
        }
      }
    });
  }

  // ── TTL ───────────────────────────────────────────────────────────────────

  setTTL(scope: string, key: string, ttlSeconds?: number) {
    const tk = this.subKey(scope, key);
    if (this.timers.has(tk)) {
      clearTimeout(this.timers.get(tk)!);
      this.timers.delete(tk);
    }
    if (!ttlSeconds || ttlSeconds <= 0) return;

    const t = setTimeout(async () => {
      try {
        this.hydratedKeys.delete(tk);
        this.loadedKeys.delete(tk);
        this.demandedKeys.delete(tk);
        this.notifyHydration(scope, key);

        this.stacks.get(scope)?.delete(key);
        if (this.history.has(tk)) this.history.delete(tk);

        try {
          const storage = getDefaultStorage();
          await storage.removeItem(this.storageKey(scope, key));
        } catch (err) {
          console.error('[StateStack] TTL persist remove error:', err);
        }
      } finally {
        this.timers.delete(tk);
        this.notify(scope, key);
      }
    }, ttlSeconds * 1000);

    this.timers.set(tk, t);
  }

  // ── Clear helpers ─────────────────────────────────────────────────────────

  async clearScope(scope: string, removePersist = true) {
    const sm = this.stacks.get(scope);
    const storage = getDefaultStorage();

    if (sm) {
      for (const key of Array.from(sm.keys())) {
        const ik = this.subKey(scope, key);

        this.hydratedKeys.delete(ik);
        this.loadedKeys.delete(ik);
        this.demandedKeys.delete(ik);
        this.notifyHydration(scope, key);
        this.hydrationSubscribers.delete(ik);
        sm.delete(key);
        this.notify(scope, key);

        if (this.timers.has(ik)) {
          clearTimeout(this.timers.get(ik)!);
          this.timers.delete(ik);
        }
        if (this.history.has(ik)) this.history.delete(ik);

        if (removePersist) {
          try {
            await storage.removeItem(this.storageKey(scope, key));
            this.broadcastStateChange(scope, key, null);
          } catch (err) {
            console.error('[StateStack] clearScope persist remove error:', err);
          }
        }
      }
      this.stacks.delete(scope);
    }

    // Clean up orphaned loaded keys that were never in stacks
    for (const ik of Array.from(this.loadedKeys)) {
      const [ks, k] = this.parseSubKey(ik);
      if (ks !== scope) continue;

      this.hydratedKeys.delete(ik);
      this.loadedKeys.delete(ik);
      this.demandedKeys.delete(ik);
      this.notifyHydration(ks, k);
      this.hydrationSubscribers.delete(ik);

      if (removePersist) {
        try {
          await storage.removeItem(this.storageKey(scope, k));
          this.broadcastStateChange(scope, k, null);
        } catch (err) {
          console.error('[StateStack] clearScope orphan remove error:', err);
        }
      }
    }

    this.scopeSubscriberCounts.delete(scope);
  }

  async clearByPathname(pathname: string, removePersist = true) {
    await this.clearScope(`route:${pathname}`, removePersist);
  }

  async clearCurrentPath(removePersist = true) {
    if (typeof window === 'undefined') return;
    await this.clearByPathname(window.location.pathname, removePersist);
  }

  clearKey(scope: string, key: string, removePersist = true) {
    const ik = this.subKey(scope, key);

    this.hydratedKeys.delete(ik);
    this.loadedKeys.delete(ik);
    this.demandedKeys.delete(ik);
    this.notifyHydration(scope, key);
    this.hydrationSubscribers.delete(ik);

    this.stacks.get(scope)?.delete(key);
    this.notify(scope, key);

    if (this.timers.has(ik)) {
      clearTimeout(this.timers.get(ik)!);
      this.timers.delete(ik);
    }
    if (this.history.has(ik)) this.history.delete(ik);

    if (removePersist) {
      const storage = getDefaultStorage();
      storage
        .removeItem(this.storageKey(scope, key))
        .then(() => this.broadcastStateChange(scope, key, null))
        .catch((err) =>
          console.error('[StateStack] clearKey persist remove error:', err)
        );
    }
  }

  clearByPrefix(prefix: string, removePersist = true) {
    for (const [scope, sm] of this.stacks) {
      for (const key of Array.from(sm.keys())) {
        if (key.startsWith(prefix)) {
          this.clearKey(scope, key, removePersist);
        }
      }
    }

    for (const ik of Array.from(this.loadedKeys)) {
      const [scope, key] = this.parseSubKey(ik);
      if (!key.startsWith(prefix)) continue;

      this.hydratedKeys.delete(ik);
      this.loadedKeys.delete(ik);
      this.demandedKeys.delete(ik);
      this.notifyHydration(scope, key);

      if (removePersist) {
        const storage = getDefaultStorage();
        storage
          .removeItem(this.storageKey(scope, key))
          .catch((err) =>
            console.error('[StateStack] clearByPrefix persist remove error:', err)
          );
      }
    }
  }

  clearByCondition(
    condition: (scope: string, key: string) => boolean,
    removePersist = true
  ) {
    for (const [scope, sm] of this.stacks) {
      for (const key of Array.from(sm.keys())) {
        try {
          if (condition(scope, key)) this.clearKey(scope, key, removePersist);
        } catch (err) {
          console.error('[StateStack] clearByCondition error:', err);
        }
      }
    }

    for (const ik of Array.from(this.loadedKeys)) {
      const [scope, key] = this.parseSubKey(ik);
      try {
        if (!condition(scope, key)) continue;

        this.hydratedKeys.delete(ik);
        this.loadedKeys.delete(ik);
        this.demandedKeys.delete(ik);
        this.notifyHydration(scope, key);

        if (removePersist) {
          const storage = getDefaultStorage();
          storage
            .removeItem(this.storageKey(scope, key))
            .catch((err) =>
              console.error(
                '[StateStack] clearByCondition persist remove error:',
                err
              )
            );
        }
      } catch (err) {
        console.error('[StateStack] clearByCondition loaded key error:', err);
      }
    }
  }

  clearMatching(opts: {
    prefix?: string;
    contains?: string;
    regex?: RegExp;
    scope?: string;
    removePersist?: boolean;
    condition?: (scope: string, key: string) => boolean;
  }) {
    const {
      prefix,
      contains,
      regex,
      scope: onlyScope,
      removePersist = true,
      condition,
    } = opts;

    if (condition) return this.clearByCondition(condition, removePersist);

    this.clearByCondition((s, k) => {
      if (onlyScope && s !== onlyScope) return false;
      if (prefix && k.startsWith(prefix)) return true;
      if (contains && k.includes(contains)) return true;
      if (regex && regex.test(k)) return true;
      return false;
    }, removePersist);
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────

  canUndo(scope: string, key: string): boolean {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.past.length > 0;
  }

  canRedo(scope: string, key: string): boolean {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.future.length > 0;
  }

  async undo(
    scope: string,
    key: string,
    persist: boolean,
    storage: StorageAdapter
  ) {
    const ik = this.subKey(scope, key);
    return this.queueUpdate(ik, async () => {
      const h = this.history.get(ik);
      if (!h || h.past.length === 0) {
        console.warn(
          `[StateStack] undo called on "${scope}::${key}" but there is no history.`
        );
        return;
      }
      const current = this.stacks.get(scope)?.get(key);
      const prev = h.past.pop()!;
      h.future.push(safeClone(current));
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      this.stacks.get(scope)!.set(key, prev);
      this.loadedKeys.add(ik);
      if (persist) {
        try {
          await (storage || getDefaultStorage()).setItem(
            this.storageKey(scope, key),
            JSON.stringify(prev)
          );
        } catch (err) {
          console.error('[StateStack] undo persist error:', err);
        }
      }
      this.notify(scope, key);
    });
  }

  async redo(
    scope: string,
    key: string,
    persist: boolean,
    storage: StorageAdapter
  ) {
    const ik = this.subKey(scope, key);
    return this.queueUpdate(ik, async () => {
      const h = this.history.get(ik);
      if (!h || h.future.length === 0) {
        console.warn(
          `[StateStack] redo called on "${scope}::${key}" but there is no future.`
        );
        return;
      }
      const next = h.future.pop()!;
      h.past.push(safeClone(this.stacks.get(scope)?.get(key)));
      this.stacks.get(scope)!.set(key, next);
      this.loadedKeys.add(ik);
      if (persist) {
        try {
          await (storage || getDefaultStorage()).setItem(
            this.storageKey(scope, key),
            JSON.stringify(next)
          );
        } catch (err) {
          console.error('[StateStack] redo persist error:', err);
        }
      }
      this.notify(scope, key);
    });
  }

  setHistoryDepth(scope: string, key: string, depth: number) {
    const hk = this.subKey(scope, key);
    if (!this.history.has(hk)) {
      this.history.set(hk, {
        past: [],
        future: [],
        maxDepth: Math.max(1, depth),
      });
      return;
    }
    this.history.get(hk)!.maxDepth = Math.max(1, depth);
  }

  // ── Loaded / demanded / hydrated flags ────────────────────────────────────

  isLoaded(scope: string, key: string) {
    return this.loadedKeys.has(this.subKey(scope, key));
  }
  markLoaded(scope: string, key: string) {
    this.loadedKeys.add(this.subKey(scope, key));
  }
  clearLoaded(scope: string, key: string) {
    this.loadedKeys.delete(this.subKey(scope, key));
  }

  isDemanded(scope: string, key: string) {
    return this.demandedKeys.has(this.subKey(scope, key));
  }
  markDemanded(scope: string, key: string) {
    this.demandedKeys.add(this.subKey(scope, key));
  }
  clearDemanded(scope: string, key: string) {
    this.demandedKeys.delete(this.subKey(scope, key));
  }

  resetDemand(scope: string, key: string) {
    const internalKey = this.subKey(scope, key);
    this.demandedKeys.delete(internalKey);
    this.hydratedKeys.delete(internalKey);
    this.loadedKeys.delete(internalKey);
    this.notifyHydration(scope, key);
  }

  isHydrated(scope: string, key: string): boolean {
    return this.hydratedKeys.has(this.subKey(scope, key));
  }
  markHydrated(scope: string, key: string) {
    const ik = this.subKey(scope, key);
    this.hydratedKeys.add(ik);
    this.loadedKeys.add(ik);
    this.notifyHydration(scope, key);
  }

  // ── Hydration subscriptions ───────────────────────────────────────────────

  private notifyHydration(scope: string, key: string) {
    const k = this.subKey(scope, key);
    const s = this.hydrationSubscribers.get(k);
    if (!s) return;
    queueMicrotask(() => {
      for (const fn of Array.from(s)) {
        try { fn(); } catch (err) {
          console.error('[StateStack] hydration subscriber error:', err);
        }
      }
    });
  }

  subscribeToHydration(
    scope: string,
    key: string,
    fn: Subscriber
  ): () => void {
    const k = this.subKey(scope, key);
    if (!this.hydrationSubscribers.has(k))
      this.hydrationSubscribers.set(k, new Set());
    this.hydrationSubscribers.get(k)!.add(fn);

    // Fire immediately if already hydrated
    if (this.isHydrated(scope, key)) {
      queueMicrotask(() => {
        try { fn(); } catch (err) {
          console.error(
            '[StateStack] hydration subscriber immediate error:',
            err
          );
        }
      });
    }

    return () => {
      const s = this.hydrationSubscribers.get(k);
      if (s) {
        s.delete(fn);
        if (s.size === 0) this.hydrationSubscribers.delete(k);
      }
    };
  }

  // ── Demand operations ─────────────────────────────────────────────────────

  async runDemandOperation(
    scope: string,
    key: string,
    operation: () => Promise<void>
  ): Promise<void> {
    const ok = this.subKey(scope, key);

    if (this.pendingDemandOperations.has(ok)) {
      return this.pendingDemandOperations.get(ok)!;
    }

    const p = (async () => {
      try {
        if (this.isDemanded(scope, key)) return;
        await operation();
      } finally {
        this.pendingDemandOperations.delete(ok);
      }
    })();

    this.pendingDemandOperations.set(ok, p);
    return p;
  }

  // ── Cross-tab sync ────────────────────────────────────────────────────────

  private attachStorageListener() {
    if (
      this.storageEventListenerAttached ||
      typeof window === 'undefined'
    )
      return;
    if (_globalConfig.crossTabSync === false) return;

    this.storageEventListenerAttached = true;
    this.setupBroadcastChannel();

    // localStorage 'storage' fires cross-tab for backward compat and
    // for environments where BroadcastChannel is unavailable.
    // Skip if BroadcastChannel is active to avoid double-notify.
    window.addEventListener('storage', (ev) => {
      // If BroadcastChannel is active, it handles cross-tab sync — skip storage event
      if (this.broadcastChannel) return;
      try {
        if (!ev.key) return;

        let k = ev.key;
        const prefix = _globalConfig.storagePrefix
          ? `${_globalConfig.storagePrefix}:`
          : '';
        if (prefix && k.startsWith(prefix)) k = k.slice(prefix.length);

        let scope = '';
        let subKey = '';
        if (k.includes(INTERNAL_SEPARATOR)) {
          const idx = k.indexOf(INTERNAL_SEPARATOR);
          scope = k.slice(0, idx);
          subKey = k.slice(idx + INTERNAL_SEPARATOR.length);
        } else {
          const idx = k.lastIndexOf(':');
          if (idx === -1) return;
          scope = k.slice(0, idx);
          subKey = k.slice(idx + 1);
        }

        if (ev.newValue == null) {
          this.stacks.get(scope)?.delete(subKey);
          const ik = this.subKey(scope, subKey);
          this.hydratedKeys.delete(ik);
          this.loadedKeys.delete(ik);
          this.demandedKeys.delete(ik);
          this.notify(scope, subKey);
        } else {
          try {
            const parsed = JSON.parse(ev.newValue);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(subKey, parsed);
            const ik = this.subKey(scope, subKey);
            this.hydratedKeys.add(ik);
            this.loadedKeys.add(ik);
            this.notify(scope, subKey);
          } catch {
            /* ignore parse errors from other origins */
          }
        }
      } catch (err) {
        console.error('[StateStack] storage event handler error:', err);
      }
    });
  }

  /**
   * Sets up BroadcastChannel for cross-tab sync that works with IndexedDB.
   *
   * FIX — infinite broadcast loop:
   * Every outgoing message is stamped with `this.tabId`.
   * The receiver's first action is to compare the incoming tabId against
   * its own and return early if they match. This prevents the loop:
   *   Tab A: setState → broadcastStateChange (tabId = "A")
   *   Tab A: onmessage({ tabId: "A" }) → guard fires → return  ✓
   *   Tab B: onmessage({ tabId: "A" }) → guard passes → update state ✓
   */
  private setupBroadcastChannel() {
    if (this.broadcastChannelFailed) return; // Don't retry after failure
    
    if (typeof BroadcastChannel === 'undefined') {
      this.debugLog(
        'BroadcastChannel not available — cross-tab sync via localStorage events only.'
      );
      this.broadcastChannelFailed = true;
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

      this.broadcastChannel.onmessage = (
        event: MessageEvent<BroadcastMessage>
      ) => {
        try {
          const { tabId, scope, key, value } = event.data;

          // ── SELF-MESSAGE GUARD ────────────────────────────────────────────
          // Discard messages that originated from this tab. Without this guard
          // every setState triggers its own onmessage, which calls setState,
          // which triggers onmessage … infinitely.
          if (tabId === this.tabId) return;
          // ─────────────────────────────────────────────────────────────────

          if (!scope || !key) return;

          const ik = this.subKey(scope, key);

          if (value === null) {
            // Deletion broadcast from another tab
            this.stacks.get(scope)?.delete(key);
            this.hydratedKeys.delete(ik);
            this.loadedKeys.delete(ik);
            this.demandedKeys.delete(ik);
            this.notify(scope, key);
            this.notifyHydration(scope, key);
          } else {
            // Update broadcast from another tab
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(key, value);
            this.hydratedKeys.add(ik);
            this.loadedKeys.add(ik);
            this.notify(scope, key);
            this.notifyHydration(scope, key);
          }

          // Removed cross-tab update log to reduce console spam
        } catch (err) {
          console.error(
            '[StateStack] BroadcastChannel onmessage error:',
            err
          );
        }
      };

      this.broadcastChannel.onmessageerror = (event) => {
        console.error('[StateStack] BroadcastChannel message error:', event);
      };

      // Removed initialization log to reduce console spam
    } catch (err) {
      console.error('[StateStack] Failed to setup BroadcastChannel:', err);
      this.broadcastChannelFailed = true;
      this.broadcastChannel = undefined;
    }
  }

  /**
   * Sends a state-change notification to all other tabs.
   * Stamps `this.tabId` on the payload so the receiver can suppress its
   * own loopback messages via the self-message guard above.
   */
  private broadcastStateChange(
    scope: string,
    key: string,
    value: unknown
  ) {
    if (!this.broadcastChannel) return;
    try {
      const msg: BroadcastMessage = {
        tabId: this.tabId,
        scope,
        key,
        value,
        timestamp: Date.now(),
      };
      this.broadcastChannel.postMessage(msg);
      // Removed debug log to reduce console spam
    } catch (err) {
      console.error('[StateStack] broadcastStateChange error:', err);
    }
  }

  // ── Debug & lifecycle ─────────────────────────────────────────────────────

  debug() {
    const stacks: Record<string, Record<string, unknown>> = {};
    for (const [scope, m] of this.stacks) {
      stacks[scope] = {};
      for (const [k, v] of m) stacks[scope][k] = v;
    }
    return {
      tabId: this.tabId,
      stacks,
      timers: Array.from(this.timers.keys()),
      historyKeys: Array.from(this.history.keys()),
      subscribers: Array.from(this.subscribers.keys()),
      scopeSubscriberCounts: Array.from(
        this.scopeSubscriberCounts.entries()
      ),
      autoClearScopes: Array.from(this.autoClearScopes),
      pendingUpdates: Array.from(this.pendingUpdates.keys()),
      hydratedKeys: Array.from(this.hydratedKeys),
      loadedKeys: Array.from(this.loadedKeys),
      broadcastChannelActive: !!this.broadcastChannel,
    };
  }

  dispose() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
        this.broadcastChannel = undefined;
        // Removed close log to reduce console spam
      } catch (err) {
        console.error('[StateStack] Error closing BroadcastChannel:', err);
      }
    }
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    // Allow re-initialization after dispose
    StateStackCore._instance = null;
    StateStackCore._listenerAttached = false;
  }
}

// ---------------------------------------------------------------------------
// Public helpers & hooks
// ---------------------------------------------------------------------------

type MethodFn<S = any> = (state: S, ...args: any[]) => S;
type MethodDict<S = any> = Record<string, MethodFn<S>>;
type ParamsForMethod<F> = F extends (
  state: any,
  ...args: infer A
) => any
  ? A
  : never;

export interface StackConfig<S> {
  initial: S;
  ttl?: number;
  persist?: boolean;
  storage?: StorageAdapter;
  historyDepth?: number;
  middleware?: Array<(prev: S, next: S, action: string) => S | void>;
  clearOnZeroSubscribers?: boolean;
}

type InferStateFromMethods<T> = T extends MethodDict<infer S> ? S : never;
type MethodsFor<T> = T extends MethodDict<infer S> ? T : never;

// ---------------------------------------------------------------------------
// createStateStack
// ---------------------------------------------------------------------------

export function createStateStack<
  Blueprints extends Record<string, MethodDict>
>(methodBlueprints: Blueprints) {
  const core = StateStackCore.instance;

  function useStack<Key extends keyof Blueprints & string>(
    key: Key,
    config: StackConfig<InferStateFromMethods<Blueprints[Key]>>,
    scope = 'global'
  ) {
    type StateType = InferStateFromMethods<Blueprints[Key]>;
    const storage = config.storage || getDefaultStorage();
    const keyStr = String(key);
    const persist = !!config.persist;
    const ttl = config.ttl;
    const historyDepth = config.historyDepth ?? 50;

    // Stabilise initial value so inline literals don't cause dep-loop renders.
    const initialRef = useRef(config.initial as StateType);

    const [isHydrated, setIsHydrated] = useState(() =>
      core.isHydrated(scope, keyStr)
    );

    useEffect(
      () =>
        core.subscribeToHydration(scope, keyStr, () => {
          setIsHydrated((prev) => {
            const next = core.isHydrated(scope, keyStr);
            return prev === next ? prev : next;
          });
        }),
      [scope, keyStr]
    );

    const state = useSyncExternalStore(
      useCallback((callback) => core.subscribe(scope, keyStr, callback), [scope, keyStr]),
      useCallback(() => core.getStateSync(scope, keyStr, initialRef.current), [scope, keyStr]),
      useCallback(() => initialRef.current, [])
    );

    useEffect(() => {
      if (!persist) return;
      let mounted = true;
      (async () => {
        try {
          const didHydrate = await core.ensureHydrated(
            scope,
            keyStr,
            initialRef.current,
            persist,
            storage
          );
          if (mounted && didHydrate) core.notify(scope, keyStr);
        } catch (err) {
          console.error('[StateStack] hydrate error:', err);
        }
      })();
      return () => { mounted = false; };
    }, [scope, keyStr, persist, storage]);

    useEffect(() => {
      core.setHistoryDepth(scope, keyStr, historyDepth);
    }, [scope, keyStr, historyDepth]);

    useEffect(() => {
      if (config.clearOnZeroSubscribers) core.enableAutoClearOnZero(scope);
      return () => {
        if (config.clearOnZeroSubscribers)
          core.disableAutoClearOnZero(scope);
      };
    }, [scope, config.clearOnZeroSubscribers]);

    const methods = useMemo(() => {
      const m = methodBlueprints[key];
      const out: Record<string, (...args: unknown[]) => Promise<void>> = {};

      for (const methodName of Object.keys(m)) {
        out[methodName] = async (...args: unknown[]) => {
          const current = await core.getState(
            scope,
            keyStr,
            initialRef.current,
            persist,
            storage
          );
          let next = (m as Record<string, MethodFn>)[methodName](
            current,
            ...args
          );
          if (config.middleware?.length) {
            for (const mw of config.middleware) {
              const result = mw(
                current as StateType,
                next as StateType,
                methodName
              );
              if (result !== undefined) next = result;
            }
          }
          await core.setState(scope, keyStr, next, persist, storage, true);
          core.setTTL(scope, keyStr, ttl);
        };
      }
      return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, keyStr, ttl, persist, config.middleware, storage]);

    const undo = useCallback(
      async () => core.undo(scope, keyStr, persist, storage),
      [scope, keyStr, persist, storage]
    );

    const redo = useCallback(
      async () => core.redo(scope, keyStr, persist, storage),
      [scope, keyStr, persist, storage]
    );

    const result = {
      [keyStr]: state,
      [`${keyStr}$`]: methods,
      __meta: {
        undo,
        redo,
        canUndo: () => core.canUndo(scope, keyStr),
        canRedo: () => core.canRedo(scope, keyStr),
        clear: (removePersist = true) => core.clearKey(scope, keyStr, removePersist),
        clearByScope: (removePersist = true) => core.clearScope(scope, removePersist),
        isHydrated,
      },
    } as unknown as {
      [K in Key]: StateType;
    } & {
      [K2 in `${Key}$`]: {
        [M in keyof MethodsFor<Blueprints[Key]>]: (...args: ParamsForMethod<MethodsFor<Blueprints[Key]>[M]>) => Promise<void>;
      };
    } & { __meta: any };

    return result;
  }

  return { useStack };
}

/** Infers __meta type only — never executed at runtime. */
function _metaShape() {
  return {
    undo: async () => {},
    redo: async () => {},
    canUndo: () => false as boolean,
    canRedo: () => false as boolean,
    clear: (_removePersist?: boolean): void => {},
    clearByScope: (_removePersist?: boolean): Promise<void> =>
      Promise.resolve(),
    isHydrated: false as boolean,
  };
}

// ---------------------------------------------------------------------------
// useDemandState
// ---------------------------------------------------------------------------

export function useDemandState<T>(
  initial: T,
  opts?: {
    key?: string;
    persist?: boolean;
    ttl?: number;
    storage?: StorageAdapter;
    historyDepth?: number;
    clearOnUnmount?: boolean;
    clearOnBack?: boolean;
    deps?: React.DependencyList;
    clearOnZeroSubscribers?: boolean;
    scope?: string;
  }
): [
  T,
  (
    loader: (
      helpers: { get: () => T; set: (v: T) => void }
    ) => void | Promise<void>
  ) => void,
  (v: T | ((prev: T) => T)) => void,
  {
    clear: (removePersist?: boolean) => void;
    clearByScope: (scope: string, removePersist?: boolean) => void;
    clearByPathname: (removePersist?: boolean) => void;
    clearByPrefix: (prefix: string, removePersist?: boolean) => void;
    clearByCondition: (
      condition: (scope: string, key: string) => boolean,
      removePersist?: boolean
    ) => void;
    isHydrated: boolean;
  }
] {
  const pathname = usePathname();

  if (!pathname && _globalConfig.debug) {
    console.warn(
      '[StateStack] useDemandState: usePathname() returned null. ' +
        "State will be scoped to 'route:unknown', risking key collisions. " +
        'Provide an explicit `scope` via opts to avoid this.'
    );
  }

  const resolvedPathname = pathname || 'unknown';
  const scope = opts?.scope || `route:${resolvedPathname}`;
  const key = opts?.key ?? 'demand';
  const ttl = opts?.ttl;
  const persist = opts?.persist ?? true;
  const storage = opts?.storage || getDefaultStorage();
  const historyDepth = opts?.historyDepth ?? 10;
  const clearOnUnmount = opts?.clearOnUnmount ?? false;
  const clearOnBack = opts?.clearOnBack ?? false;
  const deps = opts?.deps ?? [];
  const clearOnZeroSubscribers = opts?.clearOnZeroSubscribers ?? false;

  const core = StateStackCore.instance;
  const initialRef = useRef(initial);

  const [isHydrated, setIsHydrated] = useState(() =>
    core.isHydrated(scope, key)
  );

  useEffect(() => {
    const unsubscribe = core.subscribeToHydration(scope, key, () => {
      const next = core.isHydrated(scope, key);
      setIsHydrated((prev) => (prev === next ? prev : next));
    });
    return unsubscribe;
  }, [scope, key]);

  const state = useSyncExternalStore(
    useCallback((cb) => core.subscribe(scope, key, cb), [scope, key]),
    useCallback(
      () => core.getStateSync(scope, key, initialRef.current),
      [scope, key]
    ),
    useCallback(() => initialRef.current, [])
  );

  useEffect(() => {
    if (!persist) return;
    let mounted = true;
    (async () => {
      try {
        const didHydrate = await core.ensureHydrated(
          scope,
          key,
          initialRef.current,
          persist,
          storage
        );
        if (mounted && didHydrate) core.notify(scope, key);
      } catch (err) {
        console.error('[useDemandState] hydrate error:', err);
      }
    })();
    return () => { mounted = false; };
  }, [scope, key, persist, storage]);

  useEffect(() => {
    core.setHistoryDepth(scope, key, historyDepth);
  }, [scope, key, historyDepth]);

  useEffect(() => {
    if (!clearOnUnmount) return;
    return () => { core.clearScope(scope); };
  }, [scope, clearOnUnmount]);

  useEffect(() => {
    if (!clearOnBack || typeof window === 'undefined') return;
    const handler = () => core.clearScope(scope);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [scope, clearOnBack]);

  useEffect(() => {
    if (clearOnZeroSubscribers) core.enableAutoClearOnZero(scope);
    return () => {
      if (clearOnZeroSubscribers) core.disableAutoClearOnZero(scope);
    };
  }, [scope, clearOnZeroSubscribers]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { core.resetDemand(scope, key); }, deps);

  const demand = useCallback(
    (
      loader: (
        helpers: { get: () => T; set: (v: T) => void }
      ) => void | Promise<void>
    ) => {
      if (core.isDemanded(scope, key)) return;
      core
        .runDemandOperation(scope, key, async () => {
          const ctx = {
            get: () =>
              core.getStateSync(scope, key, initialRef.current) as T,
            set: (v: T) => {
              core.setState(scope, key, v, persist, storage);
              if (ttl) core.setTTL(scope, key, ttl);
              core.markDemanded(scope, key);
              core.markHydrated(scope, key);
            },
          };
          await Promise.resolve(loader(ctx));
        })
        .catch((err) =>
          console.error('[useDemandState] loader error:', err)
        );
    },
    [scope, key, ttl, persist, storage]
  );

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const prev = core.getStateSync(scope, key, initialRef.current) as T;
      const next =
        typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      core.setState(scope, key, next, persist, storage);
      if (ttl) core.setTTL(scope, key, ttl);
      core.markDemanded(scope, key);
      core.markHydrated(scope, key);
    },
    [scope, key, ttl, persist, storage]
  );

  const clear = useCallback(
    (removePersist = true) => core.clearKey(scope, key, removePersist),
    [scope, key]
  );

  const clearByScope = useCallback(
    (scopeArg: string, removePersist = true) =>
      core.clearScope(scopeArg, removePersist),
    []
  );

  const clearByPathname = useCallback(
    (removePersist = true) =>
      core.clearByPathname(resolvedPathname, removePersist),
    [resolvedPathname]
  );

  const clearByPrefix = useCallback(
    (prefix: string, removePersist = true) =>
      core.clearByPrefix(prefix, removePersist),
    []
  );

  const clearByCondition = useCallback(
    (
      condition: (scope: string, key: string) => boolean,
      removePersist = true
    ) => core.clearByCondition(condition, removePersist),
    []
  );

  return [
    state,
    demand,
    set,
    {
      clear,
      clearByScope,
      clearByPathname,
      clearByPrefix,
      clearByCondition,
      isHydrated,
    },
  ];
}

// ---------------------------------------------------------------------------
// AtomStore — lightweight global key-value atoms
// ---------------------------------------------------------------------------

/**
 * Per-key promise chain guarantees all concurrent set() calls
 * are applied in order with none silently dropped.
 */
class AtomStore {
  private atoms = new Map<string, unknown>();
  private subs = new Map<string, Set<() => void>>();
  private updateChains = new Map<string, Promise<void>>();

  private notifySubscribers(key: string) {
    queueMicrotask(() => {
      const s = this.subs.get(key);
      if (!s) return;
      for (const fn of s) {
        try { fn(); } catch (err) {
          console.error('[Atom] subscriber error', err);
        }
      }
    });
  }

  get<T>(key: string, initial: T): T {
    if (!this.atoms.has(key)) this.atoms.set(key, safeClone(initial));
    return this.atoms.get(key) as T;
  }

  set<T>(key: string, value: T) {
    const prev = this.updateChains.get(key) ?? Promise.resolve();
    const next: Promise<void> = prev
      .then(() => {
        this.atoms.set(key, safeClone(value));
        this.notifySubscribers(key);
      })
      .catch((err) => console.error('[Atom] set error:', err));
    this.updateChains.set(key, next);
    next.finally(() => {
      if (this.updateChains.get(key) === next)
        this.updateChains.delete(key);
    });
  }

  subscribe(key: string, fn: () => void): () => void {
    if (!this.subs.has(key)) this.subs.set(key, new Set());
    this.subs.get(key)!.add(fn);
    return () => this.subs.get(key)?.delete(fn);
  }

  debug() {
    const atoms: Record<string, unknown> = {};
    for (const [k, v] of this.atoms) atoms[k] = v;
    return {
      atoms,
      subscribers: Array.from(this.subs.keys()),
      pendingChains: Array.from(this.updateChains.keys()),
    };
  }
}

const atomStore = new AtomStore();

// ---------------------------------------------------------------------------
// useAtom
// ---------------------------------------------------------------------------

export function useAtom<T>(
  key: string,
  initial: T
): [T, (v: T | ((prev: T) => T)) => void] {
  const state = useSyncExternalStore(
    useCallback((cb) => atomStore.subscribe(key, cb), [key]),
    useCallback(() => atomStore.get(key, initial), [key, initial]),
    useCallback(() => initial, [initial])
  );

  const setter = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next =
        typeof v === 'function'
          ? (v as (p: T) => T)(atomStore.get(key, initial))
          : v;
      atomStore.set(key, next);
    },
    [key, initial]
  );

  return [state, setter];
}

// ---------------------------------------------------------------------------
// useComputed
// ---------------------------------------------------------------------------

/**
 * Derives a value via useMemo — always in sync at render time.
 * No one-tick stale-value flash compared to useState + useEffect.
 */
export function useComputed<T>(
  compute: () => T,
  defaultValue: T,
  deps: React.DependencyList = []
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    try {
      return compute();
    } catch (err) {
      console.error('[useComputed] compute error:', err);
      return defaultValue;
    }
  }, deps);
}

// ---------------------------------------------------------------------------
// useToggle / useList
// ---------------------------------------------------------------------------

export function useToggle(initial = false) {
  const [v, setV] = useState(initial);
  const toggle = useCallback(() => setV((p) => !p), []);
  return [v, toggle, setV] as const;
}

export function useList<T>(initial: T[] = []) {
  const [list, setList] = useState<T[]>(initial);
  const push = useCallback(
    (item: T) => setList((l) => [...l, item]),
    []
  );
  const removeAt = useCallback(
    (idx: number) => setList((l) => l.filter((_, i) => i !== idx)),
    []
  );
  const clear = useCallback(() => setList([]), []);
  const updateAt = useCallback(
    (idx: number, item: T) =>
      setList((l) => l.map((x, i) => (i === idx ? item : x))),
    []
  );
  return { list, push, removeAt, clear, updateAt, setList } as const;
}

// ---------------------------------------------------------------------------
// Named adapter exports
// ---------------------------------------------------------------------------

export { indexedDBAdapter, browserStorageAdapter };

// ---------------------------------------------------------------------------
// Dev global inspector
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (
    window as Window & { __STATE_STACK__?: unknown }
  ).__STATE_STACK__ = {
    core: StateStackCore.instance,
    atomStore,
    initStateStack,
    debug: () => ({
      stateStack: StateStackCore.instance.debug(),
      atoms: atomStore.debug(),
      globalConfig: _globalConfig,
    }),
    adapters: {
      indexedDB: indexedDBAdapter,
      localStorage: browserStorageAdapter,
      default: defaultStorageAdapter,
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level StateStack façade
// ---------------------------------------------------------------------------

const coreInstance = StateStackCore.instance;

export const StateStack = {
  core: coreInstance,
  init: initStateStack,
  createStateStack,
  useDemandState,
  useAtom,
  useComputed,
  useToggle,
  useList,
  getDefaultStorage,

  // Bound core methods — no anonymous wrappers so call sites get correct `this`.
  clearKey: coreInstance.clearKey.bind(coreInstance),
  clearScope: coreInstance.clearScope.bind(coreInstance),
  clearByPathname: coreInstance.clearByPathname.bind(coreInstance),
  clearCurrentPath: (removePersist = true) => {
    if (typeof window !== 'undefined') {
      coreInstance.clearByPathname(
        window.location.pathname,
        removePersist
      );
    }
  },
  clearByPrefix: coreInstance.clearByPrefix.bind(coreInstance),
  clearByCondition: coreInstance.clearByCondition.bind(coreInstance),
  clearMatching: coreInstance.clearMatching.bind(coreInstance),

  adapters: {
    indexedDB: indexedDBAdapter,
    localStorage: browserStorageAdapter,
    default: defaultStorageAdapter,
  },
} as const;