'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsTop } from '@academix-admin/navigation-stack';
import { dateTime, time } from '@/lib/format';
import type { Message } from '@/lib/types';
import { Loading, PageScaffold, useHideTabBar } from '@/components/ui/page';
import { useSubmit } from '@/components/ui/dialogs';
import { SendIcon } from '@/components/ui/icons';
import styles from './conversation.module.css';

const POLL_MS = 3000;

/**
 * A conversation, one-to-one or in a group: the messages, and the box at the foot of the screen.
 * The tab bar steps aside while it's open, so the box sits on the keyboard. New messages are polled
 * for only while this page is the one on screen.
 */
export function Conversation({ title, subtitle, me, read, send, showSender = false }: {
  title: string;
  subtitle?: string;
  me: string | null;
  read: () => Promise<Message[]>;
  send: (body: string) => Promise<void>;
  showSender?: boolean;
}) {
  useHideTabBar();
  const isTop = useIsTop();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const { busy, submit, dialog } = useSubmit();
  const endRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });

  const refresh = useCallback(async () => {
    try {
      setMessages(await readRef.current());
    } catch {
      // The next poll tries again; what's on screen stays.
    }
  }, []);

  useEffect(() => {
    if (!me || !isTop) return;
    void refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [me, isTop, refresh]);

  useLayoutEffect(() => {
    if ((messages?.length ?? 0) > seen.current) endRef.current?.scrollIntoView({ block: 'end' });
    seen.current = messages?.length ?? 0;
  }, [messages]);

  const onSend = () => {
    const body = text.trim();
    if (!body) return;
    void submit(async () => {
      await send(body);
      setText('');
      await refresh();
    });
  };

  return (
    <PageScaffold
      title={title}
      subtitle={subtitle}
      bottomBar={
        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" enterKeyHint="send" />
          <button type="submit" aria-label="Send" disabled={busy || !text.trim()}><SendIcon size="20px" /></button>
        </form>
      }
    >
      {messages === null ? (
        <Loading />
      ) : messages.length === 0 ? (
        <p className={styles.empty}>No messages yet. Write the first one below.</p>
      ) : (
        <ol className={styles.messages}>
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <li key={m.id} className={styles.message} data-mine={mine || undefined}>
                {showSender && !mine && <span className={styles.sender}>{m.profiles?.full_name}</span>}
                <p>{m.body}</p>
                <time dateTime={m.created_at} title={dateTime(m.created_at)}>{time(m.created_at)}</time>
              </li>
            );
          })}
        </ol>
      )}
      <div ref={endRef} />
      {dialog}
    </PageScaffold>
  );
}
