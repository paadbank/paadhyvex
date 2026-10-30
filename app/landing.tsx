'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, animate, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { TAGLINE } from '@/lib/brand';
import { count, excerpt } from '@/lib/format';
import { useGirlsToReach } from '@/lib/reach';
import type { FounderStory, Story } from '@/lib/types';
import { Marquee } from '@/components/public/marquee';
import { PillarIndex, SiteFooter, SiteHeader } from '@/components/public/site';
import { StoryCard } from '@/components/stories/story-cards';
import { Mark } from '@/components/ui/logo';
import styles from './page.module.css';

export type Photo = { src: string; alt: string };

export type LandingData = {
  photos: Photo[];
  places: string[];
  people: number;
  pads: number;
  founder: FounderStory | null;
  film: { url: string; title: string; place: string; text: string } | null;
  stories: Story[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

const WORK = [
  { title: 'Free pad distribution', body: 'We reach schools, communities and individuals who cannot afford sanitary pads, delivering dignity directly to those who need it most.' },
  { title: 'Cycle tracking', body: 'Beneficiaries can log and track their cycles, receive predictions and monitor their health with a simple, private calendar.' },
  { title: 'Distribution network', body: 'A managed network of distributors gets pads to the right people, through pickup or direct delivery to homes and schools.' },
  { title: 'Support and community', body: 'A safe space to reach distributors and admins, ask questions and share experiences without shame or stigma.' },
];

const SERVED = [
  { title: 'Students and girls', body: 'Female students who miss school or struggle in silence because of their period. Every girl deserves to learn without shame.' },
  { title: 'Women in the community', body: 'Women in developing communities like Sabogida Ora, where access to basic menstrual products is still a daily challenge.' },
  { title: 'Partners and sponsors', body: 'NGOs, individuals and organisations who believe dignity is not a privilege. Your support funds outreaches and changes lives.' },
];

const SCHOOLS = ['Breakthrough Group of Schools', 'Holy Trinity School', 'Emmanuel College', 'Holy Trinity Grammar School', 'Sabogida Ora'];

/** The photographs from the `start`th onward, wrapping round, so each wall and section differs. */
function from(photos: Photo[], start: number, length: number) {
  if (photos.length === 0) return [];
  return Array.from({ length }, (_, i) => photos[(start + i) % photos.length]);
}

function Frame({ photo, sizes, priority = false, hidden = false }: { photo: Photo; sizes: string; priority?: boolean; hidden?: boolean }) {
  // Only our own storage goes through the image optimiser; anything else is shown as it is.
  const optimised = /supabase\.co|cloudinary\.com/.test(photo.src);
  const [failed, setFailed] = useState(false);
  // A photo that can't load leaves its plain tile rather than a broken-image icon.
  if (failed) return null;
  return <Image src={photo.src} alt={hidden ? '' : photo.alt} fill sizes={sizes} priority={priority} unoptimized={!optimised} className={styles.photo} onError={() => setFailed(true)} />;
}

/** One moving column (or, on a phone, row) of the photo wall. */
function PhotoStrip({ photos, direction, seconds, priority = false }: { photos: Photo[]; direction: 'up' | 'down' | 'left'; seconds: number; priority?: boolean }) {
  const tile = (photo: Photo, i: number, hidden: boolean) => (
    <figure key={`${photo.src}${i}`} className={styles.tile}>
      <Frame photo={photo} sizes="(min-width: 960px) 22vw, 60vw" priority={priority && !hidden && i < 2} hidden={hidden} />
    </figure>
  );
  return (
    <Marquee direction={direction} seconds={seconds} copy={photos.map((p, i) => tile(p, i, true))}>
      {photos.map((p, i) => tile(p, i, false))}
    </Marquee>
  );
}

/** Faces from the field. Each circle moves on to another photograph in turn, so the row is alive. */
function LiveAvatars({ photos }: { photos: Photo[] }) {
  const [tick, setTick] = useState(0);
  const reduced = useReducedMotion();
  const shown = 4;

  useEffect(() => {
    if (reduced || photos.length <= shown) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(timer);
  }, [reduced, photos.length]);

  return (
    <div className={styles.avatars} aria-hidden="true">
      {Array.from({ length: shown }, (_, slot) => {
        // One circle changes on each tick, so they never all turn over at once.
        const turns = Math.floor(tick / shown) + (tick % shown > slot ? 1 : 0);
        const photo = photos[(slot * 3 + turns * shown) % photos.length];
        return (
          <span key={slot} className={styles.avatar}>
            <AnimatePresence initial={false}>
              <motion.span key={photo.src} className={styles.avatarFace} initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                <Image src={photo.src} alt="" fill sizes="56px" className={styles.photo} />
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </div>
  );
}

/** A figure that counts up the first time it comes into view. It shows the true figure until then. */
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!seen || reduced) return;
    const controls = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [seen, value, reduced]);

  return <span ref={ref}>{count(shown ?? value)}{suffix}</span>;
}

/** The headline, word by word, rising out of a mask: the page's one entrance. */
function Headline({ text }: { text: string }) {
  const reduced = useReducedMotion();
  return (
    <h1 className={styles.headline} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={i} className={styles.word} aria-hidden="true">
          <motion.span initial={reduced ? false : { y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: EASE }}>{word}</motion.span>{' '}
        </span>
      ))}
    </h1>
  );
}

/** Something that settles into place as it is scrolled to. */
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** A large photograph that drifts a little slower than the page as it passes. */
function DriftingPhoto({ photo, sizes }: { photo: Photo; sizes: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-6%', '6%']);
  return (
    <div ref={ref} className={styles.drift}>
      <motion.div className={styles.driftInner} style={{ y }}>
        <Frame photo={photo} sizes={sizes} />
      </motion.div>
    </div>
  );
}

export default function Landing({ data }: { data: LandingData }) {
  const { photos, film, founder, stories, people, pads } = data;
  const router = useRouter();
  const girlsToReach = useGirlsToReach();
  const places = [...new Set([...data.places, ...SCHOOLS])];
  const hasPhotos = photos.length > 0;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <Headline text={TAGLINE} />
            <motion.div className={styles.heroBody} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45, ease: EASE }}>
              <p>Restoring dignity and changing lives across schools and communities in Sabogida Ora and beyond.</p>
              <div className={styles.actions}>
                <Link href="/signup" className={styles.primary}>Join PAADHYVEX</Link>
                <Link href="/stories" className={styles.secondary}>See our stories</Link>
              </div>
              {hasPhotos && (
                <div className={styles.live}>
                  <LiveAvatars photos={photos} />
                  <p>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {people > 0 ? <><strong>{count(people)} people</strong> in our stories from the field</> : 'Stories from the field'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
          {hasPhotos && (
            <div className={styles.wall} role="group" aria-label="Photographs from our outreaches">
              <div className={styles.wallRow}><PhotoStrip photos={from(photos, 0, 8)} direction="left" seconds={48} priority /></div>
              <div className={styles.wallColumns}>
                <PhotoStrip photos={from(photos, 0, 6)} direction="up" seconds={46} priority />
                <PhotoStrip photos={from(photos, 6, 6)} direction="down" seconds={54} />
                <PhotoStrip photos={from(photos, 12, 6)} direction="up" seconds={50} />
              </div>
            </div>
          )}
        </section>

        <div className={styles.ticker}>
          <Marquee seconds={36}>
            {places.map((place) => (
              <span key={place} className={styles.tickerItem}><Mark size={20} /> {place}</span>
            ))}
          </Marquee>
        </div>

        <section className={styles.mission}>
          <Reveal className={styles.missionText}>
            <h2>Access to menstrual products is a basic human right, not a luxury.</h2>
            <p>PAADHYVEX exists so that no girl misses school, no woman is left without support, and no person has to choose between dignity and survival.</p>
            <p>Through free pad distribution, cycle tracking, community outreach and a growing network of distributors, we are building a future where menstrual health is accessible to all, regardless of income, location or circumstance.</p>
            <Link href="/about" className={styles.textLink}>Read how it began</Link>
          </Reveal>
          {hasPhotos && <DriftingPhoto photo={photos[1 % photos.length]} sizes="(min-width: 960px) 50vw, 100vw" />}
        </section>

        <section className={styles.impact} aria-label="Our impact so far">
          <dl>
            <div><dd><CountUp value={Math.max(pads, 116)} suffix="+" /></dd><dt>Pads distributed</dt></div>
            {people > 0 && <div><dd><CountUp value={people} /></dd><dt>People in our stories</dt></div>}
            <div><dd><CountUp value={4} suffix="+" /></dd><dt>Schools and communities reached</dt></div>
          </dl>
        </section>

        <section className={styles.work}>
          <Reveal><h2>What we do</h2></Reveal>
          <ul>
            {WORK.map((item, i) => (
              <li key={item.title}>
                <Reveal>
                  {hasPhotos && <div className={styles.workPhoto}><Frame photo={photos[(i * 3 + 2) % photos.length]} sizes="(min-width: 960px) 25vw, (min-width: 600px) 50vw, 100vw" /></div>}
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.name}>
          <Reveal className={styles.nameIntro}>
            <h2>What the name means</h2>
            <p>PAADHYVEX is more than a name. Its letters say what we stand for, and the last one is why we keep going.</p>
            <Link href="/about" className={styles.textLink}>More about us</Link>
          </Reveal>
          <PillarIndex />
        </section>

        {film && (
          <section className={styles.film}>
            <Reveal><h2>From the field</h2></Reveal>
            <Reveal className={styles.filmBody}>
              <video src={`${film.url}#t=0.1`} controls playsInline preload="metadata" aria-label={film.title} />
              <div>
                <h3>{film.title}</h3>
                {film.place && <p className={styles.muted}>{film.place}</p>}
                <p>{excerpt(film.text, 180)}</p>
                <Link href="/stories" className={styles.textLink}>See all stories</Link>
              </div>
            </Reveal>
          </section>
        )}

        <section className={styles.served}>
          <Reveal><h2>Who we serve</h2></Reveal>
          <ul>
            {SERVED.map((item) => (
              <li key={item.title}>
                <Reveal>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {founder && (
          <section className={styles.founder}>
            {founder.image_url && (
              <Reveal className={styles.founderPhoto}><Frame photo={{ src: founder.image_url, alt: founder.founder_name }} sizes="(min-width: 960px) 30vw, 100vw" /></Reveal>
            )}
            <Reveal className={styles.founderText}>
              <h2>{founder.title}</h2>
              <p className={styles.muted}>{founder.founder_name}</p>
              <p>{excerpt(founder.description, 320)}</p>
              <Link href="/stories" className={styles.textLink}>Read the founder&apos;s story</Link>
            </Reveal>
          </section>
        )}

        {stories.length > 0 && (
          <section className={styles.stories}>
            <Reveal className={styles.blockHead}>
              <h2>Stories from the field</h2>
              <Link href="/stories" className={styles.textLink}>View all stories</Link>
            </Reveal>
            <div className={styles.storyGrid}>
              {stories.map((story) => <StoryCard key={story.id} story={story} onOpen={() => router.push('/stories')} />)}
            </div>
          </section>
        )}

        <section className={styles.cta}>
          <div className={styles.ctaText}>
            <h2>{girlsToReach === null ? 'X is the number of girls we are yet to reach.' : `We are yet to reach ${count(girlsToReach)} girls.`}</h2>
            <p>Help us bring it down. Partner with us, sponsor a girl or fund an outreach, and together we can rewrite more stories, one pad at a time.</p>
            <div className={styles.actions}>
              <Link href="/signup" className={styles.ctaPrimary}>Join PAADHYVEX</Link>
              <Link href="/about" className={styles.ctaSecondary}>Partner with us</Link>
            </div>
          </div>
          {hasPhotos && <div className={styles.ctaPhoto}><Frame photo={photos[4 % photos.length]} sizes="(min-width: 960px) 50vw, 100vw" /></div>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
