"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ChildProgressAnalytics from '@/components/ChildProgressAnalytics';
import NotificationCenter from '@/components/NotificationCenter';

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('parent');
  const [loading, setLoading] = useState(true);
  const [childProfiles, setChildProfiles] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    async function loadSessionAndData() {
      try {
        const { data: { user: currentUser }, error: authErr } = await supabase.auth.getUser();
        
        if (authErr || !currentUser) {
          router.push('/login');
          return;
        }

        setUser(currentUser);
        const userRole = currentUser.user_metadata?.role || 'parent';
        setRole(userRole);

        // Fetch Child Profiles
        let profilesQuery = supabase.from('child_profiles').select('*');
        if (userRole === 'parent') {
          profilesQuery = profilesQuery.eq('parent_id', currentUser.id);
        }
        const { data: profileData } = await profilesQuery;
        setChildProfiles(profileData || []);

        // Fetch Assessment Cases
        let casesQuery = supabase
          .from('cases')
          .select(`
            *,
            psychologist_reviews (*)
          `)
          .order('created_at', { ascending: false });

        if (userRole === 'parent') {
          casesQuery = casesQuery.eq('user_id', currentUser.id);
        } else if (userRole === 'psychologist') {
          casesQuery = casesQuery.eq('assigned_to', currentUser.id);
        }

        const { data: caseData } = await casesQuery;
        setCases(caseData || []);

      } catch (err) {
        console.error('Error loading analytics page data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSessionAndData();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s infinite linear' }}>⏳</div>
          <p style={{ color: '#94a3b8' }}>Loading Child Progress & Analytics Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      {/* Top Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#0f172a', padding: '16px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push(role === 'admin' ? '/admin/dashboard' : role === 'psychologist' ? '/dashboard/psychologist' : '/dashboard/parent')}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Reporting & Analytics Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Logitudinal child progress tracking & evaluation report generator
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NotificationCenter user={user} role={role} />
          <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{user?.email}</div>
            <div style={{ color: '#60a5fa', textTransform: 'capitalize' }}>Role: {role}</div>
          </div>
        </div>
      </div>

      {/* Main Analytics Container */}
      <ChildProgressAnalytics
        role={role}
        user={user}
        childProfiles={childProfiles}
        cases={cases}
      />
    </div>
  );
}
