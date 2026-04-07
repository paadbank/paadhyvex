'use client';

import { useNav } from '@/lib/NavigationStack';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import styles from './page.module.css';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
};

export default function CreateGroupPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) return;

    const { data } = await supabaseBrowser
      .from('profiles')
      .select('id, full_name, role')
      .neq('id', user.id)
      .order('full_name');

    setUsers(data || []);
    setLoading(false);
  };

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.size === 0) return;

    setCreating(true);
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) return;

    const { data: group, error: groupError } = await supabaseBrowser
      .from('message_groups')
      .insert({ name: groupName, created_by: user.id })
      .select()
      .single();

    if (groupError || !group) {
      console.error('Error creating group:', groupError);
      setCreating(false);
      return;
    }

    // Include creator as a member too
    const members = [user.id, ...Array.from(selectedUsers)].map(userId => ({
      group_id: group.id,
      user_id: userId,
    }));

    const { error: membersError } = await supabaseBrowser
      .from('message_group_members')
      .insert(members);

    if (membersError) {
      console.error('Error adding members:', membersError);
    }

    setCreating(false);
    nav.replace('group_chat_page', { groupId: group.id });
  };

  if (loading || creating) return <LoadingSpinner />;

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={() => nav.pop()}>
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none">
              <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
            </svg>
          </button>
          <h1 className={styles.title}>Create Group</h1>
        </div>
      </header>

      <div className={styles.body}>
        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={`${styles.input} ${styles[`input_${theme}`]}`}
        />

        <h2 className={styles.subtitle}>Select Members ({selectedUsers.size})</h2>

        <div className={styles.userList}>
          {users.map(user => (
            <div
              key={user.id}
              className={`${styles.userCard} ${styles[`userCard_${theme}`]} ${selectedUsers.has(user.id) ? styles.selected : ''}`}
              onClick={() => toggleUser(user.id)}
            >
              <div className={styles.avatar}>{user.full_name[0].toUpperCase()}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.full_name}</div>
                <div className={styles.userRole}>{user.role}</div>
              </div>
              {selectedUsers.has(user.id) && (
                <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={createGroup}
          disabled={!groupName.trim() || selectedUsers.size === 0 || creating}
          className={styles.createButton}
        >
          {creating ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </main>
  );
}
