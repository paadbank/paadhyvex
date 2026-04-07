'use client';

import { useNav, useObject } from '@/lib/NavigationStack';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import styles from './page.module.css';

type MessageGroup = {
  id: string;
  name: string;
  created_by: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string };
};

export default function GroupChatPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const { groupId } = (nav.peek()?.params ?? {}) as { groupId?: string };
  const getGroupResult = useObject<(id: string) => MessageGroup | undefined>('getGroupById', { stack: true });
  const [selectedGroup, setSelectedGroup] = useState<MessageGroup | null>(null);
  const [resolving, setResolving] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) { setResolving(false); return; }

    // Try registry first
    if (getGroupResult.isProvided) {
      const group = getGroupResult.getter()(groupId);
      if (group) { setSelectedGroup(group); setResolving(false); return; }
    }

    // Fallback: fetch from DB
    supabaseBrowser
      .from('message_groups')
      .select('id, name, created_by')
      .eq('id', groupId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedGroup(data);
        } else if (nav.isTop()) {
          nav.pop();
        }
        setResolving(false);
      });
  }, [getGroupResult.isProvided, groupId]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      if (!selectedGroup) return;

      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data } = await supabaseBrowser
        .from('messages')
        .select('*, profiles:sender_id(full_name)')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedGroup) return;

    const { error } = await supabaseBrowser.from('messages').insert({
      sender_id: currentUserId,
      group_id: selectedGroup.id,
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

  if (!selectedGroup) return null;

  if (loading) return <LoadingSpinner />;

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={() => nav.pop()}>
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none">
              <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
            </svg>
          </button>
          <div className={styles.avatar}>G</div>
          <div>
            <div className={styles.chatName}>{selectedGroup.name}</div>
            <div className={styles.chatRole}>Group Chat</div>
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
              {msg.sender_id !== currentUserId && (
                <div className={styles.senderName}>{msg.profiles?.full_name}</div>
              )}
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
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
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
