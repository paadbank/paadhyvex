'use client';

import { useState, useEffect } from 'react';
import { useNav } from '@/lib/NavigationStack';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import EmptyRecord from '@/components/EmptyRecord/EmptyRecord';
import MediaUploader, { mediaItemFromExisting, type MediaItem } from '@/components/MediaUploader/MediaUploader';
import { deleteStoryMedia } from '@/lib/media/upload';
import styles from './page.module.css';

function StoryThumb({ media, title }: { media: { processed_url: string | null; provider: string | null }; title: string }) {
  const [error, setError] = useState(false);
  if (!media.processed_url) return <span className={styles.videoIcon}>{media.provider === 'failed' ? '⚠️' : '⏳'}</span>;
  if (error) return <span className={styles.videoIcon}>⚠️</span>;
  return <img src={media.processed_url} alt={title} className={styles.thumb} onError={() => setError(true)} />;
}

function VideoThumb({ media, title }: { media: { processed_url: string | null; provider: string | null }; title: string }) {
  const [thumbnail, setThumbnail] = useState('');
  const [error, setError] = useState(false);
  const url = media.processed_url;

  // Generate thumbnail from video
  useEffect(() => {
    if (!url) return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const captureFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (err) {
        console.error('Failed to capture video frame:', err);
        setError(true);
      }
      video.remove();
    };

    video.addEventListener('loadeddata', captureFrame);
    video.addEventListener('error', () => { setError(true); video.remove(); });
    video.currentTime = 0.1;

    return () => {
      video.removeEventListener('loadeddata', captureFrame);
      video.remove();
    };
  }, [url]);

  if (!url) return <span className={styles.videoIcon}>{media.provider === 'failed' ? '⚠️' : '⏳'}</span>;

  if (error || !thumbnail) {
    return <span className={styles.videoIcon}>🎬</span>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src={thumbnail} alt={title} className={styles.thumb} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
}

type StoryMedia = { id: string; link: string; type: 'image' | 'video'; processed_url: string | null; storage_path: string | null; provider: string | null };
type StoryMember = { id: string; fullname: string };

type Story = {
  id: string;
  title: string;
  location: string;
  story_text: string;
  category: string;
  is_published: boolean;
  created_at: string;
  story_media: StoryMedia[];
  story_members: StoryMember[];
};

type FounderStory = {
  id: string;
  title: string;
  description: string;
  founder_name: string;
  founder_date: string;
  image_url: string;
  storage_path: string | null;
};

const EMPTY_FORM = {
  title: '',
  location: '',
  story_text: '',
  category: '',
  is_published: true,
};

type MemberDraft = { fullname: string };

export default function StoriesPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const [tab, setTab] = useState<'founder' | 'posts'>('founder');

  // Posts state
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mediaDrafts, setMediaDrafts] = useState<MediaItem[]>([]);
  const [memberDrafts, setMemberDrafts] = useState<MemberDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Founder story state
  const [founder, setFounder] = useState<FounderStory | null>(null);
  const [loadingFounder, setLoadingFounder] = useState(true);
  const [editingFounder, setEditingFounder] = useState(false);
  const [founderForm, setFounderForm] = useState({ title: '', description: '', founder_name: '', founder_date: '' });
  const [founderImage, setFounderImage] = useState<MediaItem[]>([]);
  const [savingFounder, setSavingFounder] = useState(false);

  useEffect(() => { loadStories(); loadFounder(); }, []);

  const loadFounder = async () => {
    setLoadingFounder(true);
    const { data } = await supabaseBrowser.from('founder_story').select('*').limit(1).single();
    setFounder(data || null);
    if (data) {
      setFounderForm({ title: data.title, description: data.description, founder_name: data.founder_name, founder_date: data.founder_date || '' });
      setFounderImage(data.image_url ? [mediaItemFromExisting(data.image_url, 'image', data.storage_path, 'supabase')] : []);
    }
    setLoadingFounder(false);
  };

  const saveFounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFounder(true);
    const img = founderImage[0];
    const payload = {
      ...founderForm,
      image_url: img?.url || '',
      processed_image_url: img?.url || null,
      storage_path: img?.storagePath || null,
    };
    if (founder) await supabaseBrowser.from('founder_story').update(payload).eq('id', founder.id);
    else await supabaseBrowser.from('founder_story').insert(payload);
    setSavingFounder(false);
    setEditingFounder(false);
    loadFounder();
  };

  const loadStories = async () => {
    setLoadingPosts(true);
    const { data } = await supabaseBrowser
      .from('stories')
      .select('*, story_media(*), story_members(*)')
      .order('created_at', { ascending: false })
      .order('created_at', { foreignTable: 'story_media', ascending: true });
    setStories((data || []) as Story[]);
    setLoadingPosts(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMediaDrafts([]);
    setMemberDrafts([]);
    setShowForm(true);
  };

  const openEdit = (story: Story) => {
    setEditing(story);
    setForm({ title: story.title, location: story.location || '', story_text: story.story_text, category: story.category || '', is_published: story.is_published });
    setMediaDrafts(story.story_media.map(m => mediaItemFromExisting(m.processed_url || m.link, m.type, m.storage_path, m.provider as any)));
    setMemberDrafts(story.story_members.map(m => ({ fullname: m.fullname })));
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaDrafts.some(m => m.status === 'uploading')) return;
    setSaving(true);
    let storyId: string;
    if (editing) {
      await supabaseBrowser.from('stories').update(form).eq('id', editing.id);
      storyId = editing.id;
      // Replace media and members
      await supabaseBrowser.from('story_media').delete().eq('story_id', storyId);
      await supabaseBrowser.from('story_members').delete().eq('story_id', storyId);
    } else {
      const { data } = await supabaseBrowser.from('stories').insert(form).select('id').single();
      storyId = data!.id;
    }
    const validMedia = mediaDrafts.filter(m => m.status === 'done');
    if (validMedia.length > 0) {
      await supabaseBrowser.from('story_media').insert(validMedia.map(m => ({
        story_id: storyId, link: m.url, type: m.type,
        processed_url: m.url, storage_path: m.storagePath, provider: m.provider,
      })));
    }
    const validMembers = memberDrafts.filter(m => m.fullname.trim());
    if (validMembers.length > 0) {
      await supabaseBrowser.from('story_members').insert(validMembers.map(m => ({ story_id: storyId, fullname: m.fullname.trim() })));
    }
    setSaving(false);
    setShowForm(false);
    loadStories();
  };

  const togglePublish = async (story: Story) => {
    await supabaseBrowser.from('stories').update({ is_published: !story.is_published }).eq('id', story.id);
    loadStories();
  };

  const deleteStory = async (id: string) => {
    if (!window.confirm('Delete this story?')) return;
    const story = stories.find(s => s.id === id);
    if (story) await Promise.all(story.story_media.map(m => deleteStoryMedia({ provider: m.provider, storagePath: m.storage_path })));
    await supabaseBrowser.from('stories').delete().eq('id', id);
    loadStories();
  };

  // Member draft helpers
  const addMember = () => setMemberDrafts(d => [...d, { fullname: '' }]);
  const removeMember = (i: number) => setMemberDrafts(d => d.filter((_, idx) => idx !== i));
  const updateMember = (i: number, fullname: string) =>
    setMemberDrafts(d => d.map((m, idx) => idx === i ? { fullname } : m));
  const moveMember = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= memberDrafts.length) return;
    setMemberDrafts(d => { const a = [...d]; [a[i], a[next]] = [a[next], a[i]]; return a; });
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <div>
            <button className={styles.backButton} onClick={() => nav.pop()}>
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none">
                <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
              </svg>
            </button>
            <h1 className={styles.title}>Stories</h1>
          </div>
          {tab === 'posts' && (
            <button onClick={openCreate} className={styles.addButton}>+ Add Story</button>
          )}
        </div>
      </header>

      <div className={styles.innerBody}>
        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'founder' ? styles.tabActive : ''}`} onClick={() => setTab('founder')}>📖 Founder Story</button>
          <button className={`${styles.tabBtn} ${tab === 'posts' ? styles.tabActive : ''}`} onClick={() => setTab('posts')}>📸 Story Posts</button>
        </div>

        {/* ── FOUNDER STORY TAB ── */}
        {tab === 'founder' && (
          loadingFounder ? <LoadingSpinner /> : (
            <div>
              {!editingFounder ? (
                <div className={`${styles.founderCard} ${styles[`founderCard_${theme}`]}`}>
                  <div className={styles.founderCardHeader}>
                    <h2 className={styles.founderCardTitle}>{founder?.title || 'No founder story yet'}</h2>
                    <button onClick={() => setEditingFounder(true)} className={styles.editBtn} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                  {founder ? (
                    <>
                      <div className={styles.founderMeta}>
                        {founder.image_url && (
                          <img
                            src={founder.image_url}
                            alt={founder.founder_name}
                            className={styles.founderAvatar}
                          />
                        )}
                        <div>
                          <p className={styles.founderName}>{founder.founder_name}</p>
                          {founder.founder_date && <p className={styles.founderDate}>{founder.founder_date}</p>}
                        </div>
                      </div>
                      <p className={styles.founderDescription}>{founder.description}</p>
                    </>
                  ) : (
                    <p className={styles.founderEmpty}>No founder story added yet. Click edit to add one.</p>
                  )}
                </div>
              ) : (
                <form onSubmit={saveFounder} className={`${styles.form} ${styles[`form_${theme}`]}`}>
                  <h3 style={{ margin: 0, gridColumn: '1 / -1' }}>Edit Founder Story</h3>
                  <div className={styles.field}>
                    <label>Section Title *</label>
                    <input value={founderForm.title} onChange={e => setFounderForm({ ...founderForm, title: e.target.value })} required placeholder="e.g. How PAADHYVEX Was Born" />
                  </div>
                  <div className={styles.field}>
                    <label>Founder / Author Name *</label>
                    <input value={founderForm.founder_name} onChange={e => setFounderForm({ ...founderForm, founder_name: e.target.value })} required placeholder="e.g. Founder, PAADHYVEX" />
                  </div>
                  <div className={styles.field}>
                    <label>Date / Period</label>
                    <input value={founderForm.founder_date} onChange={e => setFounderForm({ ...founderForm, founder_date: e.target.value })} placeholder="e.g. November 2024" />
                  </div>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Founder Image</label>
                    <MediaUploader items={founderImage} onChange={setFounderImage} theme={theme} maxItems={1} accept="image/*" label="Add founder photo" />
                  </div>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Story / Description *</label>
                    <textarea value={founderForm.description} onChange={e => setFounderForm({ ...founderForm, description: e.target.value })} rows={14} required placeholder="Tell the founding story..." />
                  </div>
                  <div className={styles.formActions}>
                    <button type="button" onClick={() => setEditingFounder(false)} className={styles.cancelBtn}>Cancel</button>
                    <button type="submit" className={styles.submitButton} disabled={savingFounder}>{savingFounder ? 'Saving…' : 'Save Founder Story'}</button>
                  </div>
                </form>
              )}
            </div>
          )
        )}

        {/* ── STORY POSTS TAB ── */}
        {tab === 'posts' && (
          <>
            {showForm && (
              <form onSubmit={handleSave} className={`${styles.form} ${styles[`form_${theme}`]}`}>
                <h3 style={{ margin: 0, gridColumn: '1 / -1' }}>{editing ? 'Edit Story' : 'New Story'}</h3>

                <div className={styles.field}>
                  <label>Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label>Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Sabogida Ora" />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. School Visit, Interview" />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Story Text *</label>
                  <textarea value={form.story_text} onChange={e => setForm({ ...form, story_text: e.target.value })} rows={5} required placeholder="Tell the story behind this photo or video..." />
                </div>

                {/* ── MEDIA ── */}
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Media</label>
                  <MediaUploader items={mediaDrafts} onChange={setMediaDrafts} theme={theme} />
                  {mediaDrafts.some(m => m.status === 'uploading') && <span className={styles.hint}>Waiting for uploads to finish…</span>}
                </div>

                {/* ── MEMBERS TABLE ── */}
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>People / Members</label>
                  <div className={styles.membersTable}>
                    {memberDrafts.map((m, i) => (
                      <div key={i} className={`${styles.memberRow} ${styles[`memberRow_${theme}`]}`}>
                        <input
                          value={m.fullname}
                          onChange={e => updateMember(i, e.target.value)}
                          placeholder="Full name"
                          className={styles.linkInput}
                        />
                        <div className={styles.rowControls}>
                          <button type="button" className={styles.arrowBtn} onClick={() => moveMember(i, -1)} disabled={i === 0} title="Move up">‹</button>
                          <button type="button" className={styles.arrowBtn} onClick={() => moveMember(i, 1)} disabled={i === memberDrafts.length - 1} title="Move down">›</button>
                          <button type="button" className={styles.removeRowBtn} onClick={() => removeMember(i)} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.addRowBtn} onClick={addMember}>+ Add Person</button>
                </div>

                <div className={styles.field}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} />
                    Publish (visible on public site)
                  </label>
                </div>
                <div className={styles.formActions}>
                  <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>Cancel</button>
                  <button type="submit" className={styles.submitButton} disabled={saving || mediaDrafts.some(m => m.status === 'uploading')}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Story'}</button>
                </div>
              </form>
            )}

            {loadingPosts ? <LoadingSpinner /> : stories.length === 0 ? (
              <EmptyRecord message="No stories yet" onReload={loadStories} theme={theme} />
            ) : (
              <div className={styles.storyList}>
                {stories.map(story => (
                  <div key={story.id} className={`${styles.card} ${styles[`card_${theme}`]}`}>
                    <div className={styles.cardLeft}>
                      <div className={styles.mediaPreview}>
                        {story.story_media[0]?.type === 'video' ? (
                          <VideoThumb media={story.story_media[0]} title={story.title} />
                        ) : story.story_media[0] ? (
                          <StoryThumb media={story.story_media[0]} title={story.title} />
                        ) : <span className={styles.videoIcon}>📷</span>}
                      </div>
                      <div className={styles.cardInfo}>
                        <h3 className={styles.cardTitle}>{story.title}</h3>
                        {story.location && <p className={styles.cardMeta}>📍 {story.location}</p>}
                        {story.category && <p className={styles.cardMeta}>🏷 {story.category}</p>}
                        <p className={styles.cardMeta}>
                          🖼 {story.story_media.length} media · 👤 {story.story_members.length} member{story.story_members.length !== 1 ? 's' : ''}
                        </p>
                        <p className={styles.cardExcerpt}>{story.story_text.length > 100 ? story.story_text.slice(0, 100) + '…' : story.story_text}</p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button onClick={() => togglePublish(story)} className={`${styles.publishBtn} ${story.is_published ? styles.published : styles.draft}`}>
                        {story.is_published ? 'Published' : 'Draft'}
                      </button>
                      <button onClick={() => openEdit(story)} className={styles.editBtn} title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => deleteStory(story.id)} className={styles.deleteBtn} title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
