'use client';

import { useState } from 'react';
import { useLocation, useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { deleteStoryMedia } from '@/lib/media/upload';
import { changed, must, useAllStories } from '@/lib/stacks/data';
import MediaUploader, { mediaItemFromExisting, type MediaItem } from '@/components/MediaUploader/MediaUploader';
import { PageScaffold } from '@/components/ui/page';
import { Section } from '@/components/ui/display';
import { useSeed, Button, FieldRow, Form, TextArea, TextField, Toggle } from '@/components/ui/controls';
import { DeleteRecord, useSubmit } from '@/components/ui/dialogs';
import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import styles from './story-form.module.css';

const EMPTY = { title: '', location: '', story_text: '', category: '', is_published: true };

export default function StoryFormPage() {
  const nav = useNav();
  const id = useLocation()?.params?.id as string | undefined;
  const stories = useAllStories();
  const existing = id ? stories.data?.find((s) => s.id === id) : undefined;
  const [values, setValues] = useState(EMPTY);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof EMPTY>) => setValues((v) => ({ ...v, ...patch }));
  const uploading = media.some((m) => m.status === 'uploading');

  useSeed(existing, (existing) => {
    setValues({ title: existing.title, location: existing.location ?? '', story_text: existing.story_text, category: existing.category ?? '', is_published: existing.is_published });
    setMedia(existing.story_media.map((m) => mediaItemFromExisting(m.processed_url || m.link, m.type, m.storage_path, m.provider as MediaItem['provider'])));
    setPeople(existing.story_members.map((m) => m.fullname));
  });

  const save = () =>
    submit(async () => {
      if (uploading) return;
      let storyId = id;
      if (storyId) {
        must(await supabaseBrowser.from('stories').update(values).eq('id', storyId));
        must(await supabaseBrowser.from('story_media').delete().eq('story_id', storyId));
        must(await supabaseBrowser.from('story_members').delete().eq('story_id', storyId));
      } else {
        storyId = (must(await supabaseBrowser.from('stories').insert(values).select('id').single()) as { id: string }).id;
      }
      const done = media.filter((m) => m.status === 'done');
      if (done.length > 0) {
        must(await supabaseBrowser.from('story_media').insert(done.map((m) => ({ story_id: storyId, link: m.url, type: m.type, processed_url: m.url, storage_path: m.storagePath, provider: m.provider }))));
      }
      const names = people.map((p) => p.trim()).filter(Boolean);
      if (names.length > 0) must(await supabaseBrowser.from('story_members').insert(names.map((fullname) => ({ story_id: storyId, fullname }))));
      changed('stories');
      await nav.pop();
    });

  return (
    <PageScaffold title={id ? 'Edit story' : 'New story'}>
      <Form onSubmit={save}>
        <TextField label="Title" value={values.title} onChange={(title) => set({ title })} required />
        <FieldRow>
          <TextField label="Location" value={values.location} onChange={(location) => set({ location })} hint="Sabogida Ora" />
          <TextField label="Category" value={values.category} onChange={(category) => set({ category })} hint="School visit" />
        </FieldRow>
        <TextArea label="Story" rows={6} value={values.story_text} onChange={(story_text) => set({ story_text })} required hint="What happened, and who was there?" />
        <Section title="Photos and videos">
          <MediaUploader items={media} onChange={setMedia} />
        </Section>
        <Section title="People in this story">
          {people.map((name, i) => (
            <div key={i} className={styles.person}>
              <TextField hint="Full name" value={name} onChange={(next) => setPeople((p) => p.map((v, x) => (x === i ? next : v)))} />
              <button type="button" aria-label={`Remove ${name || 'this person'}`} onClick={() => setPeople((p) => p.filter((_, x) => x !== i))}><CloseIcon size="18px" /></button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setPeople((p) => [...p, ''])}><PlusIcon size="18px" /> Add person</Button>
        </Section>
        <Toggle label="Publish" hint="Show this story on the public site" checked={values.is_published} onChange={(is_published) => set({ is_published })} />
        <Button type="submit" full busy={busy} disabled={uploading}>{uploading ? 'Waiting for uploads to finish' : id ? 'Save changes' : 'Add story'}</Button>
      </Form>
      {existing && (
        <DeleteRecord
          what="story"
          message="Its photos and videos are removed too."
          onDelete={async () => {
            await Promise.all(existing.story_media.map((m) => deleteStoryMedia({ provider: m.provider, storagePath: m.storage_path })));
            must(await supabaseBrowser.from('stories').delete().eq('id', existing.id));
            changed('stories');
            await nav.pop();
          }}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
