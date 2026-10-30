'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNav } from '@academix-admin/navigation-stack';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { clearCachedData, useProfile } from '@/lib/stacks/data';
import { label, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Columns, Facts, Identity, Section } from '@/components/ui/display';
import { Button, PickerField, Toggle } from '@/components/ui/controls';
import { ConfirmDialog, useSubmit } from '@/components/ui/dialogs';
import { PenIcon } from '@/components/ui/icons';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'Français' };

export default function ProfilePage() {
  const nav = useNav();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const profile = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const { busy, submit, dialog } = useSubmit();

  const signOut = () =>
    submit(async () => {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) throw new Error(error.message);
      clearCachedData();
      router.push('/');
    });

  return (
    <PageScaffold title={t('profile') || 'Profile'} actions={[{ icon: <PenIcon />, onClick: () => nav.push('profile_form_page'), ariaLabel: t('edit') || 'Edit' }]}>
      <PageState status={statusOf(profile, 'your profile')}>
        {() => {
          const p = profile.data!;
          return (
            <Columns
              main={
                <>
                  <Identity name={p.full_name} detail={label(p.role)} />
                  <Facts
                    items={[
                      [t('email') || 'Email', p.email],
                      [t('phone') || 'Phone', p.phone],
                      [t('location') || 'Location', p.location],
                      [t('occupation') || 'Occupation', p.occupation],
                      [t('date_of_birth') || 'Date of birth', shortDate(p.date_of_birth)],
                      ['Beneficiary code', p.beneficiary_code],
                    ]}
                  />
                </>
              }
              side={
                <>
                  <Section title="Preferences">
                    <Toggle label="Dark mode" checked={theme === 'dark'} onChange={toggleTheme} />
                    <PickerField
                      label={t('language') || 'Language'}
                      value={lang}
                      options={SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] }))}
                      onChange={(code) => setLang(code as typeof lang)}
                    />
                  </Section>
                  <Button variant="danger" full onClick={() => setSigningOut(true)}>{t('logout') || 'Sign out'}</Button>
                </>
              }
            />
          );
        }}
      </PageState>
      {signingOut && (
        <ConfirmDialog
          title={t('logout') || 'Sign out'}
          message={t('confirm_sign_out') || 'Are you sure you want to sign out?'}
          confirmText={t('logout') || 'Sign out'}
          busy={busy}
          onConfirm={signOut}
          onCancel={() => setSigningOut(false)}
        />
      )}
      {dialog}
    </PageScaffold>
  );
}
