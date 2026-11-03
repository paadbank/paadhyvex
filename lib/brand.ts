/**
 * What the name stands for, in one place: the landing page, About and the footer all read this.
 *
 * `word` is null where a letter has no meaning yet. It still appears in the name, but no meaning is
 * shown for it. Fill it in here and every page picks it up.
 */
export type Pillar = { letter: string; word: string | null };

export const PILLARS: Pillar[] = [
  { letter: 'P', word: 'Protection' },
  { letter: 'A', word: 'Access' },
  { letter: 'A', word: 'Awareness' },
  { letter: 'D', word: 'Dignity' },
  { letter: 'H', word: 'Hygiene' },
  { letter: 'Y', word: null },
  { letter: 'V', word: 'Value' },
  { letter: 'E', word: 'Empowerment' },
  { letter: 'X', word: 'The girls we are yet to reach' },
];

/** The letters that are drawn in the logo's red grotesque; the rest take its black serif. */
export const SANS_LETTERS_FROM = 6;

export const TAGLINE = 'One pad at a time.';

export const CONTACT_EMAIL = 'paadbank906@gmail.com';
