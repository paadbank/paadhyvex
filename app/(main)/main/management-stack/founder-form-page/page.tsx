'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useFounderStory } from '@/lib/stacks/data';
import MediaUploader, { mediaItemFromExisting, type MediaItem } from '@/components/MediaUploader/MediaUploader';
import { PageScaffold } from '@/components/ui/page';
import { Section } from '@/components/ui/display';
import { useSeed, Button, Form, TextArea, TextField } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';
import type { FounderStory } from '@/lib/types';

export default function FounderFormPage() {
  const nav = useNav();
  const founder = useFounderStory();
  const existing = founder.data?.id ? (founder.data as FounderStory) : null;
  const [values, setValues] = useState({ title: '', description: '', founder_name: '', founder_date: '' });
  const [image, setImage] = useState<MediaItem[]>([]);
  const { busy, submit, dialog } = useSubmit();
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  useSeed(existing, (existing) => {
    setValues({ title: existing.title, description: existing.description, founder_name: existing.founder_name, founder_date: existing.founder_date ?? '' });
    setImage(existing.image_url ? [mediaItemFromExisting(existing.image_url, 'image', existing.storage_path, 'supabase')] : []);
  });

  const save = () =>
    submit(async () => {
      const photo = image[0];
      const row = { ...values, image_url: photo?.url || '', processed_image_url: photo?.url || null, storage_path: photo?.storagePath || null };
      if (existing) must(await supabaseBrowser.from('founder_story').update(row).eq('id', existing.id));
      else must(await supabaseBrowser.from('founder_story').insert(row));
      changed('stories');
      await nav.pop();
    });

  return (
    <PageScaffold title="Founder story">
      <Form onSubmit={save}>
        <TextField label="Title" value={values.title} onChange={(title) => set({ title })} required hint="How PAADHYVEX was born" />
        <TextField label="Written by" value={values.founder_name} onChange={(founder_name) => set({ founder_name })} required />
        <TextField label="Date" value={values.founder_date} onChange={(founder_date) => set({ founder_date })} hint="November 2024" />
        <Section title="Photo">
          <MediaUploader items={image} onChange={setImage} maxItems={1} accept="image/*" label="Add a photo" />
        </Section>
        <TextArea label="Story" rows={12} value={values.description} onChange={(description) => set({ description })} required />
        <Button type="submit" full busy={busy}>Save founder story</Button>
      </Form>
      {dialog}
    </PageScaffold>
  );
}
