"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('auth_user_id', user.id)
          .single();

        if (profile && profile.status === 'active') {
          if (profile.role === 'user') router.push('/dashboard/parent');
          else if (profile.role === 'psychologist') router.push('/dashboard/psychologist');
          else if (profile.role === 'admin') router.push('/admin/dashboard');
        }
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const user = data.user;

      // Fetch user profile to check role and status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact administration.');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact administration.');
      }

      // Redirect based on role
      if (profile.role === 'user') {
        router.push('/dashboard/parent');
      } else if (profile.role === 'psychologist') {
        router.push('/dashboard/psychologist');
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        await supabase.auth.signOut();
        throw new Error('Invalid user role.');
      }
    } catch (err) {
      let errMsg = err.message || 'An error occurred during login.';
      if (errMsg === '{}') {
        errMsg = 'Invalid email or password. Please verify your credentials.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Back Link */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          ← Back to home
        </Link>

        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }} id="login-title">Portal Sign In</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          For Parents and AI Evaluators
        </p>

        {error && (
          <div className="alert alert-error" id="login-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              type="email"
              id="email-input"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              type="password"
              id="password-input"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
            id="btn-login-submit"
          >
            {loading ? <div className="spinner"></div> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Admin accounts must use the <Link href="/admin/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Admin Portal</Link>.
        </div>

      </div>
    </div>
  );
}
