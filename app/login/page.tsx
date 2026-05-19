'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GiSwordWound } from 'react-icons/gi';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleGoogleSignInResponse = async (response: any) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await signIn('google-one-tap', {
        credential: response.credential,
        redirect: false,
      });

      if (res?.error) {
        console.error('[SYSTEM] Google auth error response:', res);
        setError('Google authentication failed. Please try again.');
      } else {
        setSuccess('Authentication success! Transitioning...');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('[SYSTEM] Google auth caught exception:', err);
      setError('An error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Load Google Identity Services SDK
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('[SYSTEM] Google One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.');
        return;
      }

      try {
        const { google } = window as any;
        if (google) {
          // Initialize One Tap & Button
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignInResponse,
            auto_select: false,
          });

          // Trigger One Tap prompt
          google.accounts.id.prompt((notification: any) => {
            console.log('[SYSTEM] Google One Tap notification:', notification);
          });

          // Render explicit button to div if present
          const btnDiv = document.getElementById('google-signin-btn');
          if (btnDiv) {
            google.accounts.id.renderButton(btnDiv, {
              theme: 'filled_black',
              size: 'large',
              width: 320,
              text: 'signin_with',
            });
          }
        }
      } catch (err) {
        console.error('[SYSTEM] Google Sign-In init failed:', err);
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        // Sign Up
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Registration failed');
          setLoading(false);
          return;
        }

        setSuccess('Account created! Logging you in...');

        // Auto-login after signup
        const signInRes = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (signInRes?.error) {
          setError('Account created but auto-login failed. Please sign in.');
          setIsSignUp(false);
        } else {
          router.push('/dashboard');
        }
      } else {
        // Sign In
        const res = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (res?.error) {
          setError('Invalid email or password');
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <motion.div
        className={styles.loginContainer}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* System Header */}
        <motion.div
          className={styles.systemHeader}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.systemIcon}>
            <GiSwordWound />
          </div>
          <h1 className={styles.systemTitle}>SOLO LEVELING</h1>
          <p className={styles.systemSubtitle}>Personal Development System</p>
        </motion.div>

        {/* Login Panel */}
        <motion.div
          className={styles.loginPanel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Tab Toggle */}
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tab} ${!isSignUp ? styles.tabActive : ''}`}
              onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
              type="button"
              id="tab-signin"
            >
              Sign In
            </button>
            <button
              className={`${styles.tab} ${isSignUp ? styles.tabActive : ''}`}
              onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
              type="button"
              id="tab-signup"
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {isSignUp && (
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>
                  Hunter Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className={styles.formInput}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="hunter@example.com"
                className={styles.formInput}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.formLabel}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={styles.formInput}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}
            {success && <div className={styles.successMsg}>{success}</div>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              id="submit-btn"
            >
              {loading ? 'ARISE...' : isSignUp ? 'AWAKEN' : 'ENTER THE SYSTEM'}
            </button>
          </form>

          {/* Google SSO Divider & Button */}
          <div className={styles.divider}>
            <span className={styles.dividerLine}></span>
            <span className={styles.dividerText}>OR</span>
            <span className={styles.dividerLine}></span>
          </div>

          <div id="google-signin-btn" className={styles.googleBtnContainer}></div>

          <p className={styles.systemNote}>
            {isSignUp
              ? '[SYSTEM] Create your hunter profile'
              : '[SYSTEM] Awaiting authentication...'}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
