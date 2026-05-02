'use client';

import { useState, useEffect } from 'react';
import { useNav } from '@/lib/NavigationStack';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import EmptyRecord from '@/components/EmptyRecord/EmptyRecord';
import styles from './page.module.css';

type Story = {
  id: string;
  title: string;
  location: string;
  story_text: string;
  media_url: string;
  media_type: 'image' | 'video';
  category: string;
  is_published: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  title: '',
  location: '',
  story_text: '',
  media_url: '',
  media_type: 'image' as 'image' | 'video',
  category: '',
  is_published: true,
};

export default function StoriesPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    setLoading(true);
    const { data } = await supabaseBrowser
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });
    setStories(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (story: Story) => {
    setEditing(story);
    setForm({
      title: story.title,
      location: story.location || '',
      story_text: story.story_text,
      media_url: story.media_url,
      media_type: story.media_type,
      category: story.category || '',
      is_published: story.is_published,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await supabaseBrowser.from('stories').update(form).eq('id', editing.id);
    } else {
      await supabaseBrowser.from('stories').insert(form);
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
    await supabaseBrowser.from('stories').delete().eq('id', id);
    loadStories();
  };

  if (loading) return <LoadingSpinner />;

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
          <button onClick={openCreate} className={styles.addButton}>
            + Add Story
          </button>
        </div>
      </header>

      <div className={styles.innerBody}>
        {showForm && (
          <form onSubmit={handleSave} className={`${styles.form} ${styles[`form_${theme}`]}`}>
            <h3 style={{ margin: 0, gridColumn: '1 / -1' }}>{editing ? 'Edit Story' : 'New Story'}</h3>

            <div className={styles.field}>
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div className={styles.field}>
              <label>Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Douala, Cameroon" />
            </div>

            <div className={styles.field}>
              <label>Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. School Visit, Interview" />
            </div>

            <div className={styles.field}>
              <label>Media Type *</label>
              <select value={form.media_type} onChange={e => setForm({ ...form, media_type: e.target.value as 'image' | 'video' })}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Google Drive Link *</label>
              <input
                value={form.media_url}
                onChange={e => setForm({ ...form, media_url: e.target.value })}
                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                required
              />
              <span className={styles.hint}>Share the file as "Anyone with the link" then paste the link here.</span>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Story Text *</label>
              <textarea
                value={form.story_text}
                onChange={e => setForm({ ...form, story_text: e.target.value })}
                rows={5}
                required
                placeholder="Tell the story behind this photo or video..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => setForm({ ...form, is_published: e.target.checked })}
                />
                Publish (visible on public site)
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>Cancel</button>
              <button type="submit" className={styles.submitButton} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Story'}
              </button>
            </div>
          </form>
        )}

        {stories.length === 0 ? (
          <EmptyRecord message="No stories yet" onReload={loadStories} theme={theme} />
        ) : (
          <div className={styles.storyList}>
            {stories.map(story => (
              <div key={story.id} className={`${styles.card} ${styles[`card_${theme}`]}`}>
                <div className={styles.cardLeft}>
                  <div className={styles.mediaPreview}>
                    {story.media_type === 'video' ? (
                      <span className={styles.videoIcon}>🎬</span>
                    ) : (
                      <img
                        src={`https://drive.google.com/thumbnail?id=${story.media_url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]}&sz=w200`}
                        alt={story.title}
                        className={styles.thumb}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{story.title}</h3>
                    {story.location && <p className={styles.cardMeta}>📍 {story.location}</p>}
                    {story.category && <p className={styles.cardMeta}>🏷 {story.category}</p>}
                    <p className={styles.cardExcerpt}>
                      {story.story_text.length > 100 ? story.story_text.slice(0, 100) + '…' : story.story_text}
                    </p>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    onClick={() => togglePublish(story)}
                    className={`${styles.publishBtn} ${story.is_published ? styles.published : styles.draft}`}
                  >
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
      </div>
    </main>
  );
}
