'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '../auth-form.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profileCode, setProfileCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (profileCode) {
        console.log('🔍 Looking up profile code:', profileCode.toUpperCase());
        
        const { data: existingProfile, error: profileError } = await supabaseBrowser
          .from('profiles')
          .select('id, email, beneficiary_code')
          .eq('beneficiary_code', profileCode.toUpperCase())
          .single();

        console.log('📊 Profile lookup result:', { existingProfile, profileError });

        if (profileError || !existingProfile) {
          throw new Error('Invalid profile code');
        }

        if (existingProfile.email && !existingProfile.email.includes('@paadhyvex.local')) {
          throw new Error('This profile is already linked to an email');
        }

        console.log('✅ Profile found, linking email...');
        
        // Link email to existing profile - this needs to be done server-side
        const response = await fetch('/api/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: existingProfile.id,
            email,
            password,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to link email');

        console.log('🔐 Email linked, signing in...');

        const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.push('/main');
        return;
      }

      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            location,
            occupation,
            date_of_birth: dateOfBirth,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        router.push(`/signup/verification?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <div className={styles.card}>
        <button
          onClick={() => window.location.href = '/'}
          className={styles.closeButton}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h1 className={styles.title}>{t('signup') || 'Sign Up'}</h1>
        
        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t('full_name') || 'Full Name'}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('phone') || 'Phone'}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('location') || 'Location'}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('occupation') || 'Occupation'}</label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('date_of_birth') || 'Date of Birth'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : ''}
                onClick={() => dateInputRef.current?.click()}
                readOnly
                placeholder="Select date"
                className={styles.input}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              />
              <input
                ref={dateInputRef}
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'all', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('email') || 'Email'}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Profile Code (Optional)</label>
            <input
              type="text"
              value={profileCode}
              onChange={(e) => setProfileCode(e.target.value)}
              className={styles.input}
              placeholder="Enter if provided by admin"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('password') || 'Password'}</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeButton}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading && <div className={styles.spinner}></div>}
            {loading ? t('loading') : t('signup')}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="/login" className={styles.link}>
            {t('have_account') || 'Already have an account? Login'}
          </a>
        </div>
      </div>
    </div>
  );
}
