'use client';

import { useNav, useObject } from '@/lib/NavigationStack';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import styles from './page.module.css';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  email: string;
};

export default function ChatPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const { contactId } = (nav.peek()?.params ?? {}) as { contactId?: string };
  const getContactResult = useObject<(id: string) => UserProfile | undefined>('getContactById', { stack: true });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!contactId) { setResolving(false); return; }

    // Try registry first
    if (getContactResult.isProvided) {
      const user = getContactResult.getter()(contactId);
      if (user) { setSelectedUser(user); setResolving(false); return; }
    }

    // Fallback: fetch from DB
    supabaseBrowser
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('id', contactId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedUser(data);
        } else if (nav.isTop()) {
          nav.pop();
        }
        setResolving(false);
      });
  }, [getContactResult.isProvided, contactId]);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (selectedUser) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      if (!selectedUser) return;

      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data } = await supabaseBrowser
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);

      await supabaseBrowser
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', selectedUser.id);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUser) return;

    const { error } = await supabaseBrowser.from('messages').insert({
      sender_id: currentUserId,
      recipient_id: selectedUser.id,
      body: messageText,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setMessageText('');
    await loadMessages();
  };

  if (resolving) return <LoadingSpinner />;

  if (!selectedUser) return null;

  if (loading) return <LoadingSpinner />;

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={() => nav.pop()} aria-label="Go back">
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
            </svg>
          </button>
          <div className={styles.avatar}>{selectedUser.full_name?.[0]?.toUpperCase()}</div>
          <div>
            <div className={styles.chatName}>{selectedUser.full_name}</div>
            <div className={styles.chatRole}>{selectedUser.role}</div>
          </div>
        </div>
      </header>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <p className={styles.noMessages}>No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.sender_id === currentUserId ? styles.sent : styles.received}`}
            >
              <div className={styles.messageContent}>{msg.body}</div>
              <div className={styles.messageTime}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className={`${styles.messageForm} ${styles[`messageForm_${theme}`]}`}>
        <input
          ref={inputRef}
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onFocus={scrollToBottom}
          placeholder="Type a message..."
          className={styles.messageInput}
        />
        <button type="submit" className={styles.sendButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </main>
  );
}
