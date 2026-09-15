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
      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s infinite linear' }}>⏳</div>
          <p style={{ color: '#475569', fontWeight: 600 }}>Loading Child Progress & Analytics Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      {/* Top Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#ffffff', padding: '16px 24px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push(role === 'admin' ? '/admin/dashboard' : role === 'psychologist' ? '/dashboard/psychologist' : '/dashboard/parent')}
            style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Reporting & Analytics Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Longitudinal child progress tracking & evaluation report generator
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NotificationCenter user={user} role={role} />
          <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{user?.email}</div>
            <div style={{ color: '#16a34a', textTransform: 'capitalize', fontWeight: 700 }}>Role: {role}</div>
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
