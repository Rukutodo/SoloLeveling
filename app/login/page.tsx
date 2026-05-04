'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
      <div className={styles.loginContainer}>
        {/* System Header */}
        <div className={styles.systemHeader}>
          <div className={styles.systemIcon}>
            <GiSwordWound />
          </div>
          <h1 className={styles.systemTitle}>SOLO LEVELING</h1>
          <p className={styles.systemSubtitle}>Personal Development System</p>
        </div>

        {/* Login Panel */}
        <div className={styles.loginPanel}>
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
              {loading
                ? 'Processing...'
                : isSignUp
                  ? '⚔ Awaken'
                  : '⚔ Enter the System'}
            </button>
          </form>

          <p className={styles.systemNote}>
            {isSignUp
              ? '[SYSTEM] Create your hunter profile'
              : '[SYSTEM] Awaiting authentication...'}
          </p>
        </div>
      </div>
    </div>
  );
}
