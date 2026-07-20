"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if admin is already logged in
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('auth_user_id', user.id)
          .single();

        if (profile && profile.role === 'admin' && profile.status === 'active') {
          router.push('/admin/dashboard');
        }
      }
    };
    checkAdmin();
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

      // Verify admin profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('User profile not found.');
      }

      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access Denied: Administrator permissions required.');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('This administrator account is inactive.');
      }

      router.push('/admin/dashboard');
    } catch (err) {
      let errMsg = err.message || 'An error occurred during admin login.';
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
      <div className="card" style={{ width: '100%', maxWidth: '420px', borderTop: '4px solid var(--primary)' }}>
        
        {/* Back Link */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          ← Back to home
        </Link>

        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }} id="admin-login-title">Admin Control</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Secure Administrator Authentication
        </p>

        {error && (
          <div className="alert alert-error" id="admin-login-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email-input">Admin Email</label>
            <input
              type="email"
              id="admin-email-input"
              className="form-input"
              placeholder="admin@rhad.agency"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password-input">Password</label>
            <input
              type="password"
              id="admin-password-input"
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
            id="btn-admin-login-submit"
          >
            {loading ? <div className="spinner"></div> : 'Authenticate'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          For Parents and Psychologists, use the <Link href="/login" style={{ color: 'var(--secondary)', fontWeight: '500' }}>Standard Portal</Link>.
        </div>

      </div>
    </div>
  );
}
