'use client';

import { useNav, useProvideObject, usePageLifecycle } from '@/lib/NavigationStack';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import EmptyRecord from '@/components/EmptyRecord/EmptyRecord';
import styles from './page.module.css';

type UserProfile = {
  id: string;
  full_name: string;
  role: string;
  email: string;
};

type MessageGroup = {
  id: string;
  name: string;
  created_by: string;
};

export default function MessagingPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recentChats, setRecentChats] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  useProvideObject('getContactById', () => (id: string) => users.find(u => u.id === id), { global: true, scope: 'chats', dependencies: [users] });
  useProvideObject('getGroupById', () => (id: string) => groups.find(g => g.id === id), { global: true, scope: 'chats', dependencies: [groups] });

  usePageLifecycle(nav, {
    onResume: () => {
      loadGroups();
      loadUsers();
    },
  }, []);

  useEffect(() => {
    loadUsers();
    loadGroups();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      const { data } = await supabaseBrowser
        .from('profiles')
        .select('id, full_name, role, email')
        .neq('id', user.id)
        .order('full_name');

      setUsers(data || []);

      const { data: messages } = await supabaseBrowser
        .from('messages')
        .select('sender_id, recipient_id, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      const recentUserIds = new Set<string>();
      messages?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        recentUserIds.add(otherId);
      });

      const recentUsers = (data || []).filter(u => recentUserIds.has(u.id)).slice(0, 5);
      setRecentChats(recentUsers);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    setFilteredUsers(filtered);
  };

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      const { data } = await supabaseBrowser
        .from('message_groups')
        .select('*, message_group_members!inner(user_id)')
        .eq('message_group_members.user_id', user.id)
        .order('created_at', { ascending: false });

      setGroups(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const openChat = (user: UserProfile) => {
    nav.push('chat_page', { contactId: user.id });
  };

  const openGroupChat = (group: MessageGroup) => {
    nav.push('group_chat_page', { groupId: group.id });
  };

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
          <h1 className={styles.title}>Messages</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <div className={styles.tabs}>
          <button onClick={() => setActiveTab('contacts')} className={`${styles.tab} ${activeTab === 'contacts' ? styles.tabActive : ''}`}>
            Contacts
          </button>
          <button onClick={() => setActiveTab('groups')} className={`${styles.tab} ${activeTab === 'groups' ? styles.tabActive : ''}`}>
            Groups
          </button>
        </div>

        {activeTab === 'groups' && (
          <button onClick={() => nav.push('create_group_page')} className={styles.createGroupButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Group
          </button>
        )}

        {activeTab === 'contacts' && (
          <>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${styles.searchInput} ${styles[`searchInput_${theme}`]}`}
              />
            </div>

            <div className={styles.filters}>
              <button onClick={() => setRoleFilter('all')} className={`${styles.filter} ${roleFilter === 'all' ? styles.filterActive : ''}`}>All</button>
              <button onClick={() => setRoleFilter('beneficiary')} className={`${styles.filter} ${roleFilter === 'beneficiary' ? styles.filterActive : ''}`}>Beneficiaries</button>
              <button onClick={() => setRoleFilter('distributor')} className={`${styles.filter} ${roleFilter === 'distributor' ? styles.filterActive : ''}`}>Distributors</button>
              <button onClick={() => setRoleFilter('admin')} className={`${styles.filter} ${roleFilter === 'admin' ? styles.filterActive : ''}`}>Admins</button>
            </div>

            {recentChats.length > 0 && !searchQuery && roleFilter === 'all' && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Recent</h2>
                {recentChats.map(user => (
                  <div key={user.id} className={`${styles.contactCard} ${styles[`contactCard_${theme}`]}`} onClick={() => openChat(user)}>
                    <div className={styles.avatar}>{user.full_name[0].toUpperCase()}</div>
                    <div className={styles.contactInfo}>
                      <div className={styles.contactName}>{user.full_name}</div>
                      <div className={styles.contactRole}>{user.role}</div>
                    </div>
                    <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>All Contacts</h2>
              {filteredUsers.length === 0 ? (
                <EmptyRecord message="No contacts found" onReload={loadUsers} theme={theme} />
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className={`${styles.contactCard} ${styles[`contactCard_${theme}`]}`} onClick={() => openChat(user)}>
                    <div className={styles.avatar}>{user.full_name[0].toUpperCase()}</div>
                    <div className={styles.contactInfo}>
                      <div className={styles.contactName}>{user.full_name}</div>
                      <div className={styles.contactRole}>{user.role}</div>
                    </div>
                    <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'groups' && (
          <div className={styles.section}>
            {groups.length === 0 ? (
              <EmptyRecord message="No groups yet" onReload={loadGroups} theme={theme} />
            ) : (
              groups.map(group => (
                <div key={group.id} className={`${styles.contactCard} ${styles[`contactCard_${theme}`]}`} onClick={() => openGroupChat(group)}>
                  <div className={styles.avatar}>G</div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactName}>{group.name}</div>
                    <div className={styles.contactRole}>Group Chat</div>
                  </div>
                  <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
