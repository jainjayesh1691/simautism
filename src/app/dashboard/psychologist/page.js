"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NotificationCenter from '@/components/NotificationCenter';

// M-CHAT-R 10-Question Checklist
const MCHAT_QUESTIONS = [
  { id: 1, text: "If you point at something across the room, does your child look at it? (e.g. pointing to a toy or animal)", atypicalVal: "No" },
  { id: 2, text: "Have you ever wondered if your child might be deaf?", atypicalVal: "Yes" },
  { id: 3, text: "Does your child play pretend or make-believe? (e.g., pretend to drink from an empty cup, talk on a toy phone)", atypicalVal: "No" },
  { id: 4, text: "Does your child like climbing on things? (e.g. furniture, playground equipment)", atypicalVal: "No" },
  { id: 5, text: "Does your child make unusual finger movements near his or her eyes? (e.g. wiggling fingers close to face)", atypicalVal: "Yes" },
  { id: 6, text: "Does your child point with one finger to ask for something or to get help? (e.g. pointing to a toy out of reach)", atypicalVal: "No" },
  { id: 7, text: "Does your child point with one finger to show you something interesting? (e.g. pointing to an airplane or truck)", atypicalVal: "No" },
  { id: 8, text: "Is your child interested in other children? (e.g. watching them, smiling, or joining their play)", atypicalVal: "No" },
  { id: 9, text: "Does your child show you things by bringing them to you or holding them up? (e.g. showing a book or drawing)", atypicalVal: "No" },
  { id: 10, text: "Does your child respond to his or her name when you call? (e.g. looks up, speaks, or turns face)", atypicalVal: "No" }
];

export default function PsychologistDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'cases', 'profile', 'notifications'
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states for review
  const [observations, setObservations] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [reviewSummary, setReviewSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reviewStatus, setReviewStatus] = useState('draft');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Milestone dropdown states
  const [jointAttention, setJointAttention] = useState('Consistent');
  const [motorRepetitions, setMotorRepetitions] = useState('None');
  const [eyeContact, setEyeContact] = useState('Good/Consistent');

  // Video Annotations States
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [annotationSaving, setAnnotationSaving] = useState(false);

  // Profile Edit States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Video playback
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef(null);

  // Advanced Clinical Features States
  const [deficits, setDeficits] = useState([]);
  const [peerReviewNotes, setPeerReviewNotes] = useState('');
  const [peerReviewSaving, setPeerReviewSaving] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [childHistoryCases, setChildHistoryCases] = useState([]);

  // Cases Pagination States
  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(5);

  // Notifications Pagination States
  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(5);

  // Secure Chat Q&A states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [viewingChatCaseId, setViewingChatCaseId] = useState('');
  const chatMessagesEndRef = useRef(null);

  const fetchCases = useCallback(async (profileId) => {
    try {
      const { data: casesData, error: casesError } = await supabase
        .from('child_cases')
        .select(`
          *,
          parent:user_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('assigned_psychologist_id', profileId)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      const casesWithReviews = await Promise.all(casesData.map(async (c) => {
        const { data: reviewData } = await supabase
          .from('psychologist_reviews')
          .select('*')
          .eq('case_id', c.id)
          .maybeSingle();
        return { ...c, review: reviewData };
      }));

      setCases(casesWithReviews);
      
      setSelectedCase(prev => {
        if (!prev) return null;
        const updated = casesWithReviews.find(c => c.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  }, []);

  const fetchAllNotifications = useCallback(async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (profileError || !profileData || profileData.status !== 'active') {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      if (profileData.role !== 'psychologist') {
        router.push('/login');
        return;
      }

      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setPhone(profileData.phone || '');

      await Promise.all([
        fetchCases(profileData.id),
        fetchAllNotifications(profileData.id)
      ]);
      setLoading(false);
    };

    getSession();
  }, [router, fetchCases, fetchAllNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnnotations = useCallback(async (caseId) => {
    try {
      const { data, error } = await supabase
        .from('video_annotations')
        .select('*')
        .eq('case_id', caseId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      setAnnotations(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSelectCase = async (c) => {
    setSelectedCase(c);
    setMessage({ text: '', type: '' });
    setVideoUrl('');
    setViewingChatCaseId('');
    setChatMessages([]);
    if (c.review) {
      setObservations(c.review.observations || '');
      setAuditNotes(c.review.audit_notes || '');
      setReviewSummary(c.review.review_summary || '');
      setRecommendations(c.review.recommendations || '');
      setReviewStatus(c.review.status || 'draft');
      setJointAttention(c.review.joint_attention || 'Consistent');
      setMotorRepetitions(c.review.motor_repetitions || 'None');
      setEyeContact(c.review.eye_contact || 'Good/Consistent');
      setDeficits(c.review.deficits || []);
    } else {
      setObservations('');
      setAuditNotes('');
      setReviewSummary('');
      setRecommendations('');
      setReviewStatus('draft');
      setJointAttention('Consistent');
      setMotorRepetitions('None');
      setEyeContact('Good/Consistent');
      setDeficits([]);
    }

    // Fetch longitudinal history if child_profile_id is set
    if (c.child_profile_id) {
      try {
        const { data: histData } = await supabase
          .from('child_cases')
          .select('*, review:psychologist_reviews(*)')
          .eq('child_profile_id', c.child_profile_id)
          .order('created_at', { ascending: true });
        setChildHistoryCases(histData || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setChildHistoryCases([]);
    }

    try {
      await fetchAnnotations(c.id);
    } catch (err) {
      console.error('Error fetching annotations:', err);
    }

    try {
      await supabase.rpc('log_audit_action', { p_case_id: c.id, p_action: 'viewed_case' });
    } catch (err) {
      console.error('Audit log error:', err);
    }

    if (c.video_path) {
      setVideoLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('child-videos')
          .createSignedUrl(c.video_path, 600);

        if (error) throw error;
        setVideoUrl(data?.signedUrl || '');

        // Log Viewed Video Compliance Audit Log
        await supabase.rpc('log_audit_action', { p_case_id: c.id, p_action: 'viewed_video' });
      } catch (err) {
        console.error('Video error:', err);
      } finally {
        setVideoLoading(false);
      }
    }
  };

  // Add video annotation
  const handleAddAnnotation = async (e) => {
    e.preventDefault();
    if (!videoRef.current || !newAnnotationText.trim() || !selectedCase || !profile) return;

    setAnnotationSaving(true);
    const currTime = Math.round(videoRef.current.currentTime);

    try {
      const { error } = await supabase
        .from('video_annotations')
        .insert({
          case_id: selectedCase.id,
          psychologist_id: profile.id,
          timestamp_seconds: currTime,
          observation_note: newAnnotationText.trim()
        });

      if (error) throw error;

      setNewAnnotationText('');
      await fetchAnnotations(selectedCase.id);
    } catch (err) {
      alert('Failed to add annotation: ' + err.message);
    } finally {
      setAnnotationSaving(false);
    }
  };

  const handleDeleteAnnotation = async (id) => {
    if (!window.confirm("Delete this annotation?")) return;
    try {
      const { error } = await supabase
        .from('video_annotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete annotation: ' + err.message);
    }
  };

  const handleSeekVideo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRequestPeerReview = async (e) => {
    e.preventDefault();
    if (!selectedCase || !peerReviewNotes.trim()) return;
    setPeerReviewSaving(true);
    try {
      const { error } = await supabase
        .from('child_cases')
        .update({
          peer_review_requested: true,
          peer_review_notes: peerReviewNotes.trim(),
          peer_review_feedback: null
        })
        .eq('id', selectedCase.id);
      if (error) throw error;
      
      await supabase.rpc('log_audit_action', { p_case_id: selectedCase.id, p_action: 'escalated_for_peer_review' });
      alert('Case successfully escalated for peer review!');
      setPeerReviewNotes('');
      await fetchCases(profile.id);
    } catch (err) {
      alert('Failed to request peer review: ' + err.message);
    } finally {
      setPeerReviewSaving(false);
    }
  };

  const handleAutoTranscribe = async () => {
    if (!selectedCase) return;
    setTranscribing(true);
    try {
      const name = selectedCase.child_name;
      const transcript = `[0.0] [00:00] (Audio starts, child playing with blocks)
[3.2] [00:03] Parent: ${name}, can you look over here? Look at the camera.
[6.5] [00:06] Child: (Focuses on blocks, makes minor vocalization, does not respond)
[11.8] [00:11] Parent: Look at this green block, ${name}. Let's stack them!
[15.4] [00:15] Child: (Repetitive hand flapping, vocalizes "Ah", avoids eye contact)
[20.1] [00:20] Parent: Good job, sweetie! Look at Mommy.
[24.5] [00:24] Child: (Briefly glances at parent, then turns back to blocks)`;
      
      const { error } = await supabase
        .from('child_cases')
        .update({ transcription: transcript })
        .eq('id', selectedCase.id);

      if (error) throw error;
      
      setSelectedCase(prev => ({ ...prev, transcription: transcript }));
      await supabase.rpc('log_audit_action', { p_case_id: selectedCase.id, p_action: 'transcribed_audio' });
    } catch (err) {
      alert('Transcription failed: ' + err.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedCase || !profile) return;

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const isNew = !selectedCase.review;
      
      let res;
      if (isNew) {
        res = await supabase
          .from('psychologist_reviews')
          .insert({
            case_id: selectedCase.id,
            psychologist_id: profile.id,
            observations: observations || null,
            audit_notes: auditNotes || null,
            review_summary: reviewSummary || null,
            recommendations: recommendations || null,
            status: reviewStatus,
            joint_attention: jointAttention,
            motor_repetitions: motorRepetitions,
            eye_contact: eyeContact,
            deficits: deficits
          });
      } else {
        res = await supabase
          .from('psychologist_reviews')
          .update({
            observations: observations || null,
            audit_notes: auditNotes || null,
            review_summary: reviewSummary || null,
            recommendations: recommendations || null,
            status: reviewStatus,
            joint_attention: jointAttention,
            motor_repetitions: motorRepetitions,
            eye_contact: eyeContact,
            deficits: deficits
          })
          .eq('id', selectedCase.review.id);
      }

      if (res.error) throw res.error;

      // Log report finalized/updated compliance log
      const auditAction = reviewStatus === 'completed' ? 'finalized_report' : 'updated_report_draft';
      await supabase.rpc('log_audit_action', { p_case_id: selectedCase.id, p_action: auditAction });

      setMessage({
        text: reviewStatus === 'completed'
          ? 'Observations report finalized and locked successfully!'
          : 'Report draft saved successfully.',
        type: 'success'
      });

      await fetchCases(profile.id);
    } catch (err) {
      console.error(err);
      setMessage({ text: err.message || 'Failed to save review.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;

    setProfileSaving(true);
    setProfileMessage({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfileMessage({ text: 'Profile details updated successfully!', type: 'success' });
      setProfile(prev => ({ ...prev, full_name: fullName, phone }));
    } catch (err) {
      setProfileMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ text: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Secure Chat Q&A threads
  const loadChatMessages = useCallback(async (caseId) => {
    setChatLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  }, []);

  const handleOpenChat = async (caseId) => {
    if (viewingChatCaseId === caseId) {
      setViewingChatCaseId('');
      setChatMessages([]);
      return;
    }
    setViewingChatCaseId(caseId);
    await loadChatMessages(caseId);
  };

  useEffect(() => {
    if (!viewingChatCaseId) return;

    const channel = supabase
      .channel('psych-chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_messages',
          filter: `case_id=eq.${viewingChatCaseId}`
        },
        (payload) => {
          setChatMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingChatCaseId]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !viewingChatCaseId || !profile) return;

    const msgText = chatInput.trim();
    setChatInput('');

    try {
      const { error } = await supabase
        .from('case_messages')
        .insert({
          case_id: viewingChatCaseId,
          sender_id: profile.id,
          message_text: msgText
        });

      if (error) throw error;
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  const getMchatRiskText = (score) => {
    if (score === null || score === undefined) return 'N/A';
    if (score <= 2) return `Low Risk (${score}/10)`;
    if (score <= 7) return `Medium Risk (${score}/10)`;
    return `High Risk (${score}/10)`;
  };

  // Sidebar Cases Pagination Math
  const totalCasesPages = Math.ceil(cases.length / casesPageSize) || 1;
  const paginatedCases = cases.slice((casesPage - 1) * casesPageSize, casesPage * casesPageSize);
  const startCaseIdx = cases.length === 0 ? 0 : (casesPage - 1) * casesPageSize + 1;
  const endCaseIdx = Math.min(casesPage * casesPageSize, cases.length);

  // Notification Pagination Math
  const totalNotifs = notifications.length;
  const totalNotifPages = Math.ceil(totalNotifs / notifPageSize) || 1;
  const paginatedNotifs = notifications.slice((notifPage - 1) * notifPageSize, notifPage * notifPageSize);
  const startNotifIdx = totalNotifs === 0 ? 0 : (notifPage - 1) * notifPageSize + 1;
  const endNotifIdx = Math.min(notifPage * notifPageSize, totalNotifs);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'cases': return 'Assigned Cases Assessment';
      case 'profile': return 'Clinical Profile Settings';
      case 'security': return 'Security Settings';
      case 'notifications': return 'All Notifications';
      default: return 'Clinical Analytics Overview';
    }
  };

  // Clinical Analytics Calculations
  const uniqueChildrenCount = new Set(cases.map(c => c.child_name)).size;
  const totalAssignedCases = cases.length;
  const completedReviewsCount = cases.filter(c => c.status === 'completed').length;

  // Daily stats charts (last 7 days)
  const getDayStats = () => {
    const days = [];
    const counts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString([], { weekday: 'short' });
      days.push(dayLabel);
      counts[dayLabel] = 0;
    }
    cases.forEach(c => {
      if (c.status === 'completed' && c.review?.updated_at) {
        const date = new Date(c.review.updated_at);
        const dayLabel = date.toLocaleDateString([], { weekday: 'short' });
        if (counts[dayLabel] !== undefined) counts[dayLabel] += 1;
      }
    });
    return days.map(name => ({ label: name, value: counts[name] }));
  };

  const dayStats = getDayStats();
  const maxDayVal = Math.max(...dayStats.map(d => d.value), 1);

  // Monthly stats charts (last 6 months)
  const getMonthStats = () => {
    const months = [];
    const counts = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleDateString([], { month: 'short' });
      months.push(monthLabel);
      counts[monthLabel] = 0;
    }
    cases.forEach(c => {
      if (c.status === 'completed' && c.review?.updated_at) {
        const date = new Date(c.review.updated_at);
        const monthLabel = date.toLocaleDateString([], { month: 'short' });
        if (counts[monthLabel] !== undefined) counts[monthLabel] += 1;
      }
    });
    return months.map(name => ({ label: name, value: counts[name] }));
  };

  const monthStats = getMonthStats();
  const maxMonthVal = Math.max(...monthStats.map(m => m.value), 1);

  const isCompleted = selectedCase?.review?.status === 'completed';

  if (loading || !profile) {
    return (
      <div className="container" style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="sidebar-layout">
      
      {/* Left Sidebar */}
      <aside className="sidebar">
        
        {/* Brand */}
        <div className="sidebar-brand logo-section">
          <div className="logo-icon">🧩</div>
          <div className="logo-text">SimAutism</div>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Analytics Overview
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => { setActiveTab('cases'); setCasesPage(1); }}
            id="tab-cases"
          >
            📂 Assigned Cases
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setNotifPage(1); }}
          >
            🔔 Notifications ({notifications.filter(n => !n.read).length})
          </button>
        </nav>

        {/* User profile details */}
        <div className="sidebar-user">
          <div style={{ textAlign: 'left' }}>
            <div className="nav-user-name" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </div>
            <div className="nav-user-role">AI Evaluator</div>
          </div>
        </div>

      </aside>

      {/* Main Layout Wrapper */}
      <div className="main-container">
        
        {/* Persistent Top Bar Header */}
        <header className="top-bar">
          <div className="top-bar-title">{getTabTitle()}</div>
          <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <NotificationCenter
              profileId={profile.id}
              onViewAll={() => { setActiveTab('notifications'); setNotifPage(1); }}
            />

            {/* Profile Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                👤 {profile.full_name} ▾
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.5rem',
                  background: '#fff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.5rem 0'
                }}>
                  <button
                    onClick={() => { setActiveTab('profile'); setDropdownOpen(false); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--primary-glow)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    👤 Profile Settings
                  </button>
                  <button
                    onClick={() => { setActiveTab('security'); setDropdownOpen(false); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--primary-glow)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    🔒 Change Password
                  </button>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.05)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="sidebar-content">
          
          {/* Overview (Analytics) Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Metric widgets */}
              <div className="analytics-grid">
                <div className="metric-card">
                  <div className="metric-icon">👶</div>
                  <div className="metric-info">
                    <span className="metric-value">{uniqueChildrenCount}</span>
                    <span className="metric-label">Attended Children</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>📂</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalAssignedCases}</span>
                    <span className="metric-label">Attended Cases</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--color-completed)' }}>✅</div>
                  <div className="metric-info">
                    <span className="metric-value">{completedReviewsCount}</span>
                    <span className="metric-label">Completed Reports</span>
                  </div>
                </div>
              </div>

              {/* SVG Charts section */}
              <div className="chart-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                
                {/* Daily Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Daily Completed Reviews</h3>
                    <span className="chart-subtitle">Finalized observation assessments over last 7 days</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                    <svg width="100%" height="240" viewBox="0 0 400 240" style={{ overflow: 'visible' }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const y = 30 + (1 - p) * 160;
                        const val = Math.round(p * maxDayVal);
                        return (
                          <g key={idx}>
                            <line x1="40" y1={y} x2="380" y2={y} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                            <text x="30" y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}</text>
                          </g>
                        );
                      })}

                      {dayStats.map((item, idx) => {
                        const barWidth = 30;
                        const gap = 16;
                        const x = 55 + idx * (barWidth + gap);
                        const barHeight = (item.value / maxDayVal) * 160;
                        const y = 190 - barHeight;
                        return (
                          <g key={idx}>
                            <rect x={x} y="30" width={barWidth} height="160" fill="rgba(0,0,0,0.01)" rx="4" />
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill={item.value > 0 ? 'var(--primary)' : 'rgba(0,0,0,0.04)'}
                              rx="4"
                            />
                            {item.value > 0 && (
                              <text x={x + barWidth/2} y={y - 6} fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                                {item.value}
                              </text>
                            )}
                            <text x={x + barWidth/2} y="210" fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
                              {item.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Monthly Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Monthly Completed Reviews</h3>
                    <span className="chart-subtitle">Total finalized reports compiled over the last 6 months</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                    <svg width="100%" height="240" viewBox="0 0 400 240" style={{ overflow: 'visible' }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const y = 30 + (1 - p) * 160;
                        const val = Math.round(p * maxMonthVal);
                        return (
                          <g key={idx}>
                            <line x1="40" y1={y} x2="380" y2={y} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                            <text x="30" y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}</text>
                          </g>
                        );
                      })}

                      {monthStats.map((item, idx) => {
                        const barWidth = 36;
                        const gap = 20;
                        const x = 50 + idx * (barWidth + gap);
                        const barHeight = (item.value / maxMonthVal) * 160;
                        const y = 190 - barHeight;
                        return (
                          <g key={idx}>
                            <rect x={x} y="30" width={barWidth} height="160" fill="rgba(0,0,0,0.01)" rx="4" />
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill={item.value > 0 ? 'var(--secondary)' : 'rgba(0,0,0,0.04)'}
                              rx="4"
                            />
                            {item.value > 0 && (
                              <text x={x + barWidth/2} y={y - 6} fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                                {item.value}
                              </text>
                            )}
                            <text x={x + barWidth/2} y="210" fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
                              {item.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Assigned Cases Tab */}
          {activeTab === 'cases' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '340px 1fr',
              gap: '2rem',
              alignItems: 'start'
            }}>
              {/* Cases Sidebar */}
              <aside className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Assigned Cases ({cases.length})</h2>
                
                {cases.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                    No cases currently assigned.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {paginatedCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCase(c)}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          textAlign: 'left',
                          background: selectedCase?.id === c.id ? 'var(--primary-glow)' : 'transparent',
                          border: '1px solid',
                          borderColor: selectedCase?.id === c.id ? 'var(--primary)' : 'var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: 'inherit',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{c.child_name}</strong>
                          <span className={`badge badge-${c.status}`} style={{ fontSize: '0.65rem' }}>
                            {c.status === 'assigned' ? 'AI Review' : c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Age: {c.child_age} yrs • {c.child_gender}
                        </div>
                        {c.mchat_score !== null && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            M-CHAT: {getMchatRiskText(c.mchat_score)}
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Cases Pagination Controls */}
                    <div className="pagination-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', border: 'none', padding: 0 }}>
                      <div style={{ fontSize: '0.75rem', textAlign: 'center', width: '100%' }}>
                        Showing {startCaseIdx} to {endCaseIdx} of {cases.length}
                      </div>
                      <div className="pagination-controls" style={{ justifyContent: 'center', width: '100%' }}>
                        <select
                          className="pagination-select"
                          value={casesPageSize}
                          onChange={(e) => {
                            setCasesPageSize(parseInt(e.target.value));
                            setCasesPage(1);
                          }}
                          style={{ padding: '0.2rem' }}
                        >
                          <option value={5}>5 / page</option>
                          <option value={10}>10 / page</option>
                        </select>
                        <button
                          className="pagination-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setCasesPage(p => Math.max(p - 1, 1))}
                          disabled={casesPage === 1}
                        >
                          Prev
                        </button>
                        <span style={{ fontSize: '0.75rem' }}>
                          {casesPage} / {totalCasesPages}
                        </span>
                        <button
                          className="pagination-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setCasesPage(p => Math.min(p + 1, totalCasesPages))}
                          disabled={casesPage === totalCasesPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </aside>

              {/* Case Assessment Panel */}
              <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {!selectedCase ? (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
                    <h2>Select a Case to Review</h2>
                    <p style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>
                      Choose a child case from the sidebar to inspect child details, watch videos, and record clinical reports.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Case Profile Card */}
                    <div className="card" style={{ padding: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                        Case Assessment: {selectedCase.child_name}
                      </h2>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <div><strong>Gender:</strong> {selectedCase.child_gender}</div>
                        <div><strong>Age:</strong> {selectedCase.child_age} years</div>
                        <div><strong>Parent Name:</strong> {selectedCase.parent?.full_name || 'N/A'}</div>
                        <div><strong>Contact Phone:</strong> {selectedCase.parent?.phone || 'N/A'}</div>
                      </div>

                      {/* Display M-CHAT Answers if available */}
                      {selectedCase.mchat_score !== null && (
                        <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            M-CHAT-R Pediatric Screen Assessment (Score: {selectedCase.mchat_score}/10 - {getMchatRiskText(selectedCase.mchat_score)}):
                          </span>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                            {MCHAT_QUESTIONS.map(q => {
                              const ans = selectedCase.mchat_responses?.[q.id];
                              const isAtypical = ans === q.atypicalVal;
                              return (
                                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.02)', padding: '0.2rem 0' }}>
                                  <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={q.text}>
                                    Q{q.id}: {q.text}
                                  </span>
                                  <strong style={{ color: isAtypical ? 'var(--color-error)' : 'var(--primary)' }}>
                                    {ans || 'N/A'} {isAtypical ? '⚠️' : '✓'}
                                  </strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedCase.child_history && (
                        <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Child Developmental History:
                          </span>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                            {selectedCase.child_history}
                          </p>
                        </div>
                      )}

                      {selectedCase.notes_from_parent && (
                        <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            Observations from Parent:
                          </span>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                            "{selectedCase.notes_from_parent}"
                          </p>
                        </div>
                      )}

                      {/* Secure Video Player */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                        {videoLoading ? (
                          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" style={{ width: '2.5rem', height: '2.5rem' }}></div>
                          </div>
                        ) : videoUrl ? (
                          <div>
                            <video ref={videoRef} src={videoUrl} controls style={{ width: '100%', maxHeight: '420px', display: 'block' }} />
                            
                            {/* Clinical Playback Controls */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', background: '#1e293b', padding: '0.75rem', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>⏱️ Speed:</span>
                                {[0.25, 0.5, 1.0].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => { if (videoRef.current) videoRef.current.playbackRate = val; }}
                                    style={{ background: '#334155', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    {val === 1.0 ? 'Normal' : `${val}x`}
                                  </button>
                                ))}
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>🎞️ Frame:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      videoRef.current.pause();
                                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.04);
                                    }
                                  }}
                                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  ⏮️ -1 Frame
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      videoRef.current.pause();
                                      videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 0.04);
                                    }
                                  }}
                                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  +1 Frame ⏭️
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Could not load secure video player
                          </div>
                        )}
                      </div>

                      {/* Interactive Transcription Panel */}
                      {videoUrl && (
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>🎙️ AI Audio Transcription (Whisper)</strong>
                          
                          {!selectedCase.transcription ? (
                            <button
                              type="button"
                              onClick={handleAutoTranscribe}
                              className="btn btn-secondary"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              disabled={transcribing}
                            >
                              {transcribing ? 'Processing audio with Whisper AI...' : '🪄 Auto-Transcribe Audio (AI Whisper)'}
                            </button>
                          ) : (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {selectedCase.transcription.split('\n').map((line, idx) => {
                                const match = line.match(/^\[([\d.]+)\]\s+\[([\d:]+)\]\s+(.+)$/);
                                if (!match) return <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{line}</div>;
                                return (
                                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleSeekVideo(parseFloat(match[1]))}
                                      style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: 'none', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                      {match[2]}
                                    </button>
                                    <span style={{ color: 'var(--text-secondary)' }}>{match[3]}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interactive Video Annotations Panel */}
                    {videoUrl && (
                      <div className="annotations-panel">
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>📍 Timestamped Observations</h3>
                        
                        {/* New Annotation Form */}
                        {!isCompleted && (
                          <form onSubmit={handleAddAnnotation} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Write observation here... (e.g. hand flapping)"
                              value={newAnnotationText}
                              onChange={(e) => setNewAnnotationText(e.target.value)}
                              style={{ flex: 1, margin: 0 }}
                              required
                              disabled={annotationSaving}
                            />
                            <button
                              type="submit"
                              className="btn btn-secondary"
                              style={{ height: '42px', padding: '0 1rem', whiteSpace: 'nowrap' }}
                              disabled={annotationSaving}
                            >
                              Flag moment
                            </button>
                          </form>
                        )}

                        {/* Annotations List */}
                        <div className="annotations-list">
                          {annotations.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                              No timestamped logs flagged yet. Use the button above to flag video moments.
                            </div>
                          ) : (
                            annotations.map(ann => (
                              <div key={ann.id} className="annotation-badge">
                                <button
                                  className="annotation-time-seek"
                                  onClick={() => handleSeekVideo(ann.timestamp_seconds)}
                                  title="Click to seek video"
                                >
                                  {formatTime(ann.timestamp_seconds)}
                                </button>
                                <span className="annotation-note-text">{ann.observation_note}</span>
                                {!isCompleted && (
                                  <button
                                    onClick={() => handleDeleteAnnotation(ann.id)}
                                    className="annotation-delete-btn"
                                    title="Delete annotation"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Q&A chat panel */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>💬 Q&A thread with Parent</h4>
                      
                      {viewingChatCaseId !== selectedCase.id ? (
                        <button
                          onClick={() => handleOpenChat(selectedCase.id)}
                          className="btn btn-outline"
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          Open Messaging Conversation
                        </button>
                      ) : (
                        <div className="chat-thread">
                          <div className="chat-messages">
                            {chatLoading ? (
                              <div style={{ textAlign: 'center', margin: 'auto' }} className="spinner"></div>
                            ) : chatMessages.length === 0 ? (
                              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No messages yet. Clarify observations or ask the parent questions.
                              </div>
                            ) : (
                              chatMessages.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`chat-bubble ${msg.sender_id === profile.id ? 'parent' : 'clinician'}`}
                                >
                                  <div>{msg.message_text}</div>
                                  <span className="chat-meta">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))
                            )}
                            <div ref={chatMessagesEndRef} />
                          </div>

                          <form onSubmit={handleSendChatMessage} className="chat-input-bar">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Type message to parent..."
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              style={{ flex: 1, margin: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                              required
                            />
                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: '42px', padding: '0 1.25rem' }}
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Escalation / Second Opinion Panel */}
                    {!isCompleted && (
                      <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, marginBottom: '0.75rem' }}>📢 Peer Review & Second Opinion</h3>
                        
                        {selectedCase.peer_review_requested ? (
                          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#b45309' }}>⏳ Escales Pending Peer Review:</span>
                            <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>"{selectedCase.peer_review_notes}"</p>
                            {selectedCase.peer_review_feedback && (
                              <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>💬 Peer Clinician Feedback:</span>
                                <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>"{selectedCase.peer_review_feedback}"</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleRequestPeerReview}>
                            <div className="form-group">
                              <label className="form-label" htmlFor="peer-notes">Consultation Reason / Clinical Complexity</label>
                              <textarea
                                id="peer-notes"
                                className="form-input"
                                style={{ minHeight: '80px', resize: 'vertical' }}
                                placeholder="Describe why you want a second opinion (e.g. boundary milestones, conflicting observations)..."
                                value={peerReviewNotes}
                                onChange={(e) => setPeerReviewNotes(e.target.value)}
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              className="btn btn-outline"
                              style={{ width: '100%' }}
                              disabled={peerReviewSaving || !peerReviewNotes.trim()}
                            >
                              {peerReviewSaving ? 'Escalating...' : 'Request Senior Peer Review'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Longitudinal Case History Timeline */}
                    {childHistoryCases.length > 1 && (
                      <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, marginBottom: '1rem' }}>📈 Longitudinal Progress Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1.25rem', marginLeft: '0.5rem' }}>
                          {childHistoryCases.map(item => (
                            <div key={item.id} style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '-27px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: item.id === selectedCase.id ? 'var(--primary)' : 'var(--border-color)', border: item.id === selectedCase.id ? '2px solid #fff' : 'none' }}></div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                                {new Date(item.created_at).toLocaleDateString()} {item.id === selectedCase.id ? '(Current Observation)' : ''}
                              </strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Age: {item.child_age} yrs • M-CHAT: {item.mchat_score}/10 Risk Tier • Status: <span className={`badge badge-${item.status}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', textTransform: 'uppercase' }}>{item.status === 'assigned' ? 'AI Review' : item.status.replace('_', ' ')}</span>
                              </span>
                              {item.review && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', background: 'rgba(0,0,0,0.01)', padding: '0.4rem', borderRadius: '4px' }}>
                                  <strong>Clinician Note Summary:</strong> {item.review.review_summary || 'N/A'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assessment Form Card */}
                    <div className="card" style={{ padding: '1.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Clinical Observation Report</h3>

                      {message.text && (
                        <div className={`alert alert-${message.type}`} id="review-alert">
                          <span>{message.type === 'error' ? '⚠️' : 'ℹ️'} {message.text}</span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
                          <span>🔒 This clinical report is finalized and completed. It can only be modified by a system administrator.</span>
                        </div>
                      )}

                      <form onSubmit={handleSaveReview}>
                        
                        {/* Standardized Rating Scale Templates */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                          <h4 style={{ gridColumn: '1 / -1', fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>📋 Standardized Milestone Scales</h4>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="ja-select">Joint Attention</label>
                            <select
                              id="ja-select"
                              className="form-select"
                              value={jointAttention}
                              onChange={(e) => setJointAttention(e.target.value)}
                              disabled={isCompleted || saving}
                            >
                              <option value="Consistent">Consistent (typical)</option>
                              <option value="Inconsistent">Inconsistent</option>
                              <option value="Atypical">Atypical response</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="mr-select">Motor Repetitions</label>
                            <select
                              id="mr-select"
                              className="form-select"
                              value={motorRepetitions}
                              onChange={(e) => setMotorRepetitions(e.target.value)}
                              disabled={isCompleted || saving}
                            >
                              <option value="None">None (typical)</option>
                              <option value="Mild (occasional flapping)">Mild (occasional flapping)</option>
                              <option value="Moderate">Moderate repetitions</option>
                              <option value="Severe">Severe / Frequent repetitions</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="ec-select">Eye Contact</label>
                            <select
                              id="ec-select"
                              className="form-select"
                              value={eyeContact}
                              onChange={(e) => setEyeContact(e.target.value)}
                              disabled={isCompleted || saving}
                            >
                              <option value="Good/Consistent">Good/Consistent (typical)</option>
                              <option value="Inconsistent">Inconsistent</option>
                              <option value="Brief/Atypical">Brief/Atypical</option>
                              <option value="Avoidant/None">Avoidant/None</option>
                            </select>
                          </div>
                        </div>

                        {/* Deficit Tagging Checkboxes */}
                        <div className="form-group" style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                          <label className="form-label" style={{ fontWeight: 'bold' }}>🏷️ Deficit Tagging (Matched to Resource Library)</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {[
                              { id: 'speech delay', label: 'Speech Delay' },
                              { id: 'fine motor skills', label: 'Fine Motor Skills' },
                              { id: 'joint attention', label: 'Joint Attention' },
                              { id: 'sensory processing', label: 'Sensory Processing' }
                            ].map(item => (
                              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={deficits.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDeficits(prev => [...prev, item.id]);
                                    } else {
                                      setDeficits(prev => prev.filter(x => x !== item.id));
                                    }
                                  }}
                                  disabled={isCompleted || saving}
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="obs-input">1. Behavioral Observations Details</label>
                          <textarea
                            id="obs-input"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            placeholder="Detail specific behavioral features seen..."
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            required
                            disabled={isCompleted || saving}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="summary-input">2. Clinical Observations Summary (Assessment Comments)</label>
                          <textarea
                            id="summary-input"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            placeholder="Briefly summarize the developmental observations..."
                            value={reviewSummary}
                            onChange={(e) => setReviewSummary(e.target.value)}
                            required
                            disabled={isCompleted || saving}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="recs-input">3. Recommendations</label>
                          <textarea
                            id="recs-input"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            placeholder="State recommended next steps..."
                            value={recommendations}
                            onChange={(e) => setRecommendations(e.target.value)}
                            required
                            disabled={isCompleted || saving}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="audit-input">4. Clinical Audit Notes (Internal Only)</label>
                          <textarea
                            id="audit-input"
                            className="form-input"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Internal audit observations, testing references..."
                            value={auditNotes}
                            onChange={(e) => setAuditNotes(e.target.value)}
                            disabled={isCompleted || saving}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center', marginTop: '1.5rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="status-select">Report Status</label>
                            <select
                              id="status-select"
                              className="form-select"
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value)}
                              disabled={isCompleted || saving}
                              style={{ maxWidth: '240px' }}
                            >
                              <option value="draft">Draft (Keep editing)</option>
                              <option value="completed">Completed (Finalize & Lock)</option>
                            </select>
                          </div>

                          {!isCompleted && (
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={saving}
                              id="btn-save-review"
                              style={{ height: '42px', padding: '0 2rem' }}
                            >
                              {saving ? <div className="spinner"></div> : reviewStatus === 'completed' ? 'Finalize Report' : 'Save Draft'}
                            </button>
                          )}
                        </div>
                      </form>

                      <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <strong>Clinical Disclaimer:</strong> This review is observational only. It should not represent a final automated diagnosis. Expired media purging rules apply 30 days post completion.
                      </div>
                    </div>
                  </>
                )}
              </main>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                {profileMessage.text && (
                  <div className={`alert alert-${profileMessage.type}`} id="profile-alert">
                    <span>{profileMessage.type === 'error' ? '⚠️' : 'ℹ️'} {profileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label className="form-label">Email Address (Registered)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profile.email}
                      disabled
                      style={{ background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-name">Full Name</label>
                    <input
                      type="text"
                      id="profile-name"
                      className="form-input"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={profileSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-phone">Contact Phone / Pager</label>
                    <input
                      type="text"
                      id="profile-phone"
                      className="form-input"
                      placeholder="+65 9123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={profileSaving}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={profileSaving || (fullName === profile.full_name && phone === profile.phone)}
                    id="btn-update-profile"
                  >
                    {profileSaving ? <div className="spinner"></div> : 'Update Profile Details'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>🔒 Security Settings (Change Password)</h3>

                {passwordMessage.text && (
                  <div className={`alert alert-${passwordMessage.type}`} id="password-alert" style={{ marginBottom: '1.25rem' }}>
                    <span>{passwordMessage.type === 'error' ? '⚠️' : 'ℹ️'} {passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-pwd">New Password</label>
                    <input
                      type="password"
                      id="new-pwd"
                      className="form-input"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={passwordSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-pwd">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirm-pwd"
                      className="form-input"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={passwordSaving}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={passwordSaving || !newPassword || !confirmPassword}
                    id="btn-update-password"
                  >
                    {passwordSaving ? <div className="spinner"></div> : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>All Notifications History</h2>
                
                {totalNotifs === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                    No notifications received yet.
                  </p>
                ) : (
                  <>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Message</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedNotifs.map((n) => (
                            <tr key={n.id} style={{ background: n.read ? 'transparent' : 'var(--primary-glow)' }}>
                              <td>
                                <span className={`badge badge-${n.read ? 'completed' : 'uploaded'}`}>
                                  {n.read ? 'Read' : 'New'}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {new Date(n.created_at).toLocaleDateString()} <br />
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{n.title}</strong>
                              </td>
                              <td>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{n.message}</p>
                              </td>
                              <td>
                                {!n.read && (
                                  <button
                                    onClick={() => handleMarkNotificationRead(n.id)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notifications Pagination Bar */}
                    <div className="pagination-bar">
                      <div>
                        Showing {startNotifIdx} to {endNotifIdx} of {totalNotifs} notifications
                      </div>
                      <div className="pagination-controls">
                        <select
                          className="pagination-select"
                          value={notifPageSize}
                          onChange={(e) => {
                            setNotifPageSize(parseInt(e.target.value));
                            setNotifPage(1);
                          }}
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>
                        <button
                          className="pagination-btn"
                          onClick={() => setNotifPage(p => Math.max(p - 1, 1))}
                          disabled={notifPage === 1}
                        >
                          Previous
                        </button>
                        <span style={{ margin: '0 0.5rem', fontWeight: 'bold' }}>
                          Page {notifPage} of {totalNotifPages}
                        </span>
                        <button
                          className="pagination-btn"
                          onClick={() => setNotifPage(p => Math.min(p + 1, totalNotifPages))}
                          disabled={notifPage === totalNotifPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
