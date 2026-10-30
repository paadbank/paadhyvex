'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { SideDrawer } from '@academix-admin/side-drawer';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { CONTACT_EMAIL, PILLARS, SANS_LETTERS_FROM, TAGLINE } from '@/lib/brand';
import { count } from '@/lib/format';
import { useGirlsToReach } from '@/lib/reach';
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from '@/components/ui/icons';
import { Mark, Wordmark } from '@/components/ui/logo';
import styles from './site.module.css';

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/about', text: t('about_text') || 'About' },
    { href: '/stories', text: 'Stories' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <Mark size={30} />
          <Wordmark />
        </Link>
        <nav className={styles.links} aria-label="Main">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.text}</Link>)}
        </nav>
        <div className={styles.tools}>
          <button type="button" className={styles.tool} onClick={toggleTheme} aria-label={theme === 'light' ? 'Use dark theme' : 'Use light theme'}>
            {theme === 'light' ? <MoonIcon size="20px" /> : <SunIcon size="20px" />}
          </button>
          <button type="button" className={styles.tool} onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} aria-label={lang === 'en' ? 'Passer en français' : 'Switch to English'}>
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          <Link href="/login" className={styles.signIn}>{t('login') || 'Login'}</Link>
          <Link href="/signup" className={styles.join}>{t('signup') || 'Sign up'}</Link>
          <button type="button" className={styles.menu} onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuIcon size="24px" />
          </button>
        </div>
      </div>

      <SideDrawer isOpen={open} onClose={() => setOpen(false)} position="right" width={{ mobile: '85%', tablet: '360px', desktop: '360px' }} style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className={styles.drawer}>
          <button type="button" className={styles.tool} onClick={() => setOpen(false)} aria-label="Close menu"><CloseIcon size="24px" /></button>
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.text}</Link>)}
          <Link href="/privacy" onClick={() => setOpen(false)}>{t('privacy_policy') || 'Privacy'}</Link>
          <Link href="/terms" onClick={() => setOpen(false)}>{t('terms_of_service') || 'Terms'}</Link>
          <Link href="/login" className={styles.drawerSecondary}>{t('login') || 'Login'}</Link>
          <Link href="/signup" className={styles.drawerPrimary}>{t('signup') || 'Sign up'}</Link>
        </div>
      </SideDrawer>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Wordmark size="lg" />
          <p>{TAGLINE}</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/about">{t('about_text') || 'About'}</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/privacy">{t('privacy_policy') || 'Privacy policy'}</Link>
          <Link href="/terms">{t('terms_of_service') || 'Terms of service'}</Link>
        </nav>
        <div>
          <p>Partner with us. Sponsor a girl. Fund an outreach.</p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </div>
      <p className={styles.copyright}>© {new Date().getFullYear()} PAADhyvex. All rights reserved.</p>
    </footer>
  );
}

/**
 * The name read downward, set the way the logo sets it: serif black for PAADHY, grotesque red for
 * VEX. It ends on X, the one letter that is a number still to be brought down.
 */
export function PillarIndex() {
  const girlsToReach = useGirlsToReach();
  const reduced = useReducedMotion();
  return (
    <ol className={styles.pillars} aria-label="What PAADHYVEX stands for">
      {PILLARS.map((pillar, i) => {
        const last = i === PILLARS.length - 1;
        return (
          <motion.li
            key={`${pillar.letter}${i}`}
            className={styles.pillar}
            data-sans={i >= SANS_LETTERS_FROM || undefined}
            data-last={last || undefined}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.letter} aria-hidden={!pillar.word || undefined}>{pillar.letter}</span>
            {pillar.word && <span className={styles.word}>{last && girlsToReach !== null ? `${count(girlsToReach)} girls we are yet to reach` : pillar.word}</span>}
          </motion.li>
        );
      })}
    </ol>
  );
}
