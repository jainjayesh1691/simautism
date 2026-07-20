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

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'accounts_list', 'accounts_create', 'cases', 'reviews', 'audit_logs', 'notifications'
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsPageSize, setAccountsPageSize] = useState(10);

  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(10);

  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPageSize, setReviewsPageSize] = useState(5);

  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(10);

  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Accounts Tab Data
  const [accounts, setAccounts] = useState([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPhone, setNewPhone] = useState('');
  const [accountMessage, setAccountMessage] = useState({ text: '', type: '' });
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // Cases Tab Data
  const [cases, setCases] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [reassignCaseId, setReassignCaseId] = useState('');
  const [reassignPsychologistId, setReassignPsychologistId] = useState('');
  const [caseMessage, setCaseMessage] = useState({ text: '', type: '' });
  const [caseActionLoading, setCaseActionLoading] = useState(false);

  // Reviews Tab Data
  const [selectedCase, setSelectedCase] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [observations, setObservations] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [reviewSummary, setReviewSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reviewStatus, setReviewStatus] = useState('draft');
  const [reviewMessage, setReviewMessage] = useState({ text: '', type: '' });
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // Milestone Override dropdown states
  const [jointAttention, setJointAttention] = useState('Consistent');
  const [motorRepetitions, setMotorRepetitions] = useState('None');
  const [eyeContact, setEyeContact] = useState('Good/Consistent');

  // Video annotations list
  const [annotations, setAnnotations] = useState([]);
  const videoRef = useRef(null);

  // Compliance Audit Logs Data
  const [auditLogs, setAuditLogs] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Admin Profile & Password Change States
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminProfileSaving, setAdminProfileSaving] = useState(false);
  const [adminProfileMessage, setAdminProfileMessage] = useState({ text: '', type: '' });

  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasswordSaving, setAdminPasswordSaving] = useState(false);
  const [adminPasswordMessage, setAdminPasswordMessage] = useState({ text: '', type: '' });

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Peer review feedback states
  const [peerFeedbackInput, setPeerFeedbackInput] = useState('');
  const [peerFeedbackSaving, setPeerFeedbackSaving] = useState(false);

  const handleSubmitPeerFeedback = async (e) => {
    e.preventDefault();
    if (!selectedCase || !peerFeedbackInput.trim()) return;
    setPeerFeedbackSaving(true);
    try {
      const { error } = await supabase
        .from('child_cases')
        .update({
          peer_review_feedback: peerFeedbackInput.trim()
        })
        .eq('id', selectedCase.id);

      if (error) throw error;
      alert('Senior peer review feedback submitted!');
      
      setSelectedCase(prev => ({
        ...prev,
        peer_review_feedback: peerFeedbackInput.trim()
      }));
      setPeerFeedbackInput('');
      await fetchCases();
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setPeerFeedbackSaving(false);
    }
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data);
      setPsychologists(data.filter(p => p.role === 'psychologist' && p.status === 'active'));
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const { data: casesData, error: casesError } = await supabase
        .from('child_cases')
        .select(`
          *,
          parent:user_id (
            full_name,
            email
          ),
          assigned_psychologist:assigned_psychologist_id (
            id,
            full_name,
            email
          )
        `)
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

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:actor_id (
            full_name,
            email
          ),
          target_case:target_case_id (
            child_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
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

  const loadData = useCallback(async (profileId) => {
    setLoading(true);
    await Promise.all([
      fetchAccounts(),
      fetchCases(),
      fetchAuditLogs(),
      fetchAllNotifications(profileId)
    ]);
    setLoading(false);
  }, [fetchAccounts, fetchCases, fetchAuditLogs, fetchAllNotifications]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (profileError || !profileData || profileData.role !== 'admin' || profileData.status !== 'active') {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setProfile(profileData);
      setAdminFullName(profileData.full_name || '');
      setAdminPhone(profileData.phone || '');
      await loadData(profileData.id);
    };

    getSession();
  }, [router, loadData]);

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

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;

    setAdminProfileSaving(true);
    setAdminProfileMessage({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: adminFullName,
          phone: adminPhone || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setAdminProfileMessage({ text: 'Admin details updated successfully!', type: 'success' });
      setProfile(prev => ({ ...prev, full_name: adminFullName, phone: adminPhone }));
    } catch (err) {
      setAdminProfileMessage({ text: err.message || 'Failed to update admin profile.', type: 'error' });
    } finally {
      setAdminProfileSaving(false);
    }
  };

  const handleUpdateAdminPassword = async (e) => {
    e.preventDefault();
    if (!adminNewPassword || adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (adminNewPassword.length < 6) {
      setAdminPasswordMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setAdminPasswordSaving(true);
    setAdminPasswordMessage({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.updateUser({ password: adminNewPassword });
      if (error) throw error;
      setAdminPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
      setAdminNewPassword('');
      setAdminConfirmPassword('');
    } catch (err) {
      setAdminPasswordMessage({ text: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setAdminPasswordSaving(false);
    }
  };

  const handleToggleStatus = async (profileId, currentStatus) => {
    setAccountActionLoading(true);
    setAccountMessage({ text: '', type: '' });
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profileId);

      if (error) throw error;
      setAccountMessage({ text: 'Account status updated successfully.', type: 'success' });
      await fetchAccounts();
    } catch (err) {
      setAccountMessage({ text: err.message || 'Failed to update status.', type: 'error' });
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteUser = async (profileId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${name}"? This action cannot be undone and will delete all their cases, files, and records.`)) {
      return;
    }

    setAccountActionLoading(true);
    setAccountMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        p_profile_id: profileId
      });

      if (error) throw error;

      setAccountMessage({ text: `Account for "${name}" was deleted successfully.`, type: 'success' });
      await Promise.all([fetchAccounts(), fetchCases(), fetchAuditLogs()]);
    } catch (err) {
      setAccountMessage({ text: err.message || 'Failed to delete account.', type: 'error' });
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountActionLoading(true);
    setAccountMessage({ text: '', type: '' });

    try {
      const { data: newUserId, error } = await supabase.rpc('admin_create_user', {
        p_email: newEmail,
        p_password: newPassword,
        p_full_name: newName,
        p_role: newRole,
        p_phone: newPhone || null
      });

      if (error) throw error;

      setAccountMessage({ text: `Account created successfully!`, type: 'success' });
      
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setNewRole('user');

      await fetchAccounts();
      setTimeout(() => {
        setAccountMessage({ text: '', type: '' });
        setActiveTab('accounts_list');
      }, 2000);
    } catch (err) {
      setAccountMessage({ text: err.message || 'Failed to create account.', type: 'error' });
    } finally {
      setAccountActionLoading(false);
    }
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

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!reassignCaseId || !reassignPsychologistId) return;

    setCaseActionLoading(true);
    setCaseMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.rpc('manual_reassign_case', {
        p_case_id: reassignCaseId,
        p_psychologist_id: reassignPsychologistId
      });

      if (error) throw error;

      setCaseMessage({ text: 'Case successfully reassigned!', type: 'success' });
      setReassignCaseId('');
      setReassignPsychologistId('');
      await fetchCases();
    } catch (err) {
      setCaseMessage({ text: err.message || 'Failed to reassign case.', type: 'error' });
    } finally {
      setCaseActionLoading(false);
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

  const handleViewCaseReview = async (c) => {
    setSelectedCase(c);
    setActiveTab('reviews');
    setReviewMessage({ text: '', type: '' });
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
    } else {
      setObservations('');
      setAuditNotes('');
      setReviewSummary('');
      setRecommendations('');
      setReviewStatus('draft');
      setJointAttention('Consistent');
      setMotorRepetitions('None');
      setEyeContact('Good/Consistent');
    }

    await Promise.all([
      fetchAnnotations(c.id),
      supabase.rpc('log_audit_action', { p_case_id: c.id, p_action: 'viewed_case' })
    ]);

    setVideoLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('child-videos')
        .createSignedUrl(c.video_path, 600);

      if (error) throw error;
      setVideoUrl(data.signedUrl);

      // Log Viewed Video Compliance Audit Log
      await supabase.rpc('log_audit_action', { p_case_id: c.id, p_action: 'viewed_video' });
    } catch (err) {
      console.error(err);
    } finally {
      setVideoLoading(false);
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

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    setReviewActionLoading(true);
    setReviewMessage({ text: '', type: '' });

    try {
      const isNew = !selectedCase.review;

      let res;
      if (isNew) {
        res = await supabase
          .from('psychologist_reviews')
          .insert({
            case_id: selectedCase.id,
            psychologist_id: selectedCase.assigned_psychologist_id || profile.id,
            observations: observations || null,
            audit_notes: auditNotes || null,
            review_summary: reviewSummary || null,
            recommendations: recommendations || null,
            status: reviewStatus,
            joint_attention: jointAttention,
            motor_repetitions: motorRepetitions,
            eye_contact: eyeContact
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
            eye_contact: eyeContact
          })
          .eq('id', selectedCase.review.id);
      }

      if (res.error) throw res.error;

      // Reopen completed case to under_review if changed back to draft
      if (selectedCase.status === 'completed' && reviewStatus === 'draft') {
        const { error: caseUpdateErr } = await supabase
          .from('child_cases')
          .update({ status: 'under_review' })
          .eq('id', selectedCase.id);
        if (caseUpdateErr) throw caseUpdateErr;
      }

      // Log report finalized/updated compliance log
      const auditAction = reviewStatus === 'completed' ? 'finalized_report' : 'updated_report_draft';
      await supabase.rpc('log_audit_action', { p_case_id: selectedCase.id, p_action: auditAction });

      setReviewMessage({ text: 'Observations report overridden successfully!', type: 'success' });
      await fetchCases();
    } catch (err) {
      setReviewMessage({ text: err.message || 'Failed to update report.', type: 'error' });
    } finally {
      setReviewActionLoading(false);
    }
  };

  // Secure Chat Q&A threads
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [viewingChatCaseId, setViewingChatCaseId] = useState('');
  const chatMessagesEndRef = useRef(null);

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
      .channel('admin-chat-changes')
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

  // Master Analytics Calculations
  const totalParents = accounts.filter(a => a.role === 'user').length;
  const totalPsychologists = accounts.filter(a => a.role === 'psychologist').length;
  const totalChildren = cases.length;
  const totalHandledCases = cases.filter(c => c.status === 'completed').length;

  // 1. Average Turnaround Time
  const completedCasesList = cases.filter(c => c.status === 'completed');
  let avgTurnaroundHours = 0;
  if (completedCasesList.length > 0) {
    const totalMs = completedCasesList.reduce((sum, c) => {
      const start = new Date(c.created_at).getTime();
      const end = new Date(c.updated_at).getTime();
      return sum + (end - start);
    }, 0);
    avgTurnaroundHours = Math.round((totalMs / completedCasesList.length) / (1000 * 60 * 60) * 10) / 10;
  }

  // 2. Psychologist Load Breakdown
  const psychologistLoads = psychologists.map(p => {
    const activeCasesCount = cases.filter(c => 
      c.assigned_psychologist_id === p.id && 
      ['assigned', 'under_review'].includes(c.status)
    ).length;
    return {
      name: p.full_name,
      email: p.email,
      count: activeCasesCount
    };
  }).sort((a, b) => b.count - a.count);

  // 3. Case Abandonment Rate
  const parentAccounts = accounts.filter(acc => acc.role === 'user');
  const abandonedCount = parentAccounts.filter(acc => 
    !cases.some(c => c.user_id === acc.id)
  ).length;
  const abandonmentRate = parentAccounts.length > 0 
    ? Math.round((abandonedCount / parentAccounts.length) * 100) 
    : 0;

  // Monthly Handled Cases stats (last 6 months)
  const getMonthlyStats = () => {
    const months = [];
    const counts = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString([], { month: 'short' });
      months.push(monthName);
      counts[monthName] = 0;
    }
    cases.forEach(c => {
      if (c.status === 'completed' && c.updated_at) {
        const date = new Date(c.updated_at);
        const monthName = date.toLocaleDateString([], { month: 'short' });
        if (counts[monthName] !== undefined) counts[monthName] += 1;
      }
    });
    return months.map(name => ({ label: name, value: counts[name] }));
  };

  const monthlyStats = getMonthlyStats();
  const maxMonthVal = Math.max(...monthlyStats.map(m => m.value), 1);

  // Accounts Pagination Math
  const totalAccounts = accounts.length;
  const totalAccountsPages = Math.ceil(totalAccounts / accountsPageSize) || 1;
  const paginatedAccounts = accounts.slice((accountsPage - 1) * accountsPageSize, accountsPage * accountsPageSize);
  const startAccIdx = totalAccounts === 0 ? 0 : (accountsPage - 1) * accountsPageSize + 1;
  const endAccIdx = Math.min(accountsPage * accountsPageSize, totalAccounts);

  // Cases Pagination Math
  const totalCases = cases.length;
  const totalCasesPages = Math.ceil(totalCases / casesPageSize) || 1;
  const paginatedCases = cases.slice((casesPage - 1) * casesPageSize, casesPage * casesPageSize);
  const startCaseIdx = totalCases === 0 ? 0 : (casesPage - 1) * casesPageSize + 1;
  const endCaseIdx = Math.min(casesPage * casesPageSize, totalCases);

  // Reviews Sidebar Pagination Math
  const totalReviewsPages = Math.ceil(totalCases / reviewsPageSize) || 1;
  const paginatedReviews = cases.slice((reviewsPage - 1) * reviewsPageSize, reviewsPage * reviewsPageSize);
  const startRevIdx = totalCases === 0 ? 0 : (reviewsPage - 1) * reviewsPageSize + 1;
  const endRevIdx = Math.min(reviewsPage * reviewsPageSize, totalCases);

  // Compliance Audit Logs Pagination Math
  const totalAudits = auditLogs.length;
  const totalAuditPages = Math.ceil(totalAudits / auditPageSize) || 1;
  const paginatedAudits = auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);
  const startAuditIdx = totalAudits === 0 ? 0 : (auditPage - 1) * auditPageSize + 1;
  const endAuditIdx = Math.min(auditPage * auditPageSize, totalAudits);

  // Notification Pagination Math
  const totalNotifs = notifications.length;
  const totalNotifPages = Math.ceil(totalNotifs / notifPageSize) || 1;
  const paginatedNotifs = notifications.slice((notifPage - 1) * notifPageSize, notifPage * notifPageSize);
  const startNotifIdx = totalNotifs === 0 ? 0 : (notifPage - 1) * notifPageSize + 1;
  const endNotifIdx = Math.min(notifPage * notifPageSize, totalNotifs);

  // Breadcrumbs title helper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'accounts_list': return 'User Registry & Accounts';
      case 'accounts_create': return 'Create New User Account';
      case 'cases': return 'Cases & Clinician Assignments';
      case 'reviews': return 'Clinical Observation Report Override';
      case 'audit_logs': return 'HIPAA Compliance System Audit Logs';
      case 'profile': return 'Admin Profile Settings';
      case 'security': return 'Admin Security Settings';
      case 'notifications': return 'All Notifications';
      default: return 'System Administration Analytics';
    }
  };

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
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>🧩</div>
          <div className="logo-text">SimAutism <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>ADMIN</span></div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics Dashboard
          </button>

          <button
            className={`sidebar-link ${activeTab === 'accounts_list' ? 'active' : ''}`}
            onClick={() => { setActiveTab('accounts_list'); setAccountsPage(1); }}
            id="tab-accounts-list"
          >
            📂 User Registry
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'accounts_create' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts_create')}
            id="tab-accounts-create"
          >
            ➕ Create Account
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => { setActiveTab('cases'); setCasesPage(1); }}
            id="tab-cases"
          >
            📂 Cases & Assignments
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reviews'); setReviewsPage(1); }}
            id="tab-reviews"
          >
            🩺 Clinical Reviews
          </button>

          <button
            className={`sidebar-link ${activeTab === 'audit_logs' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audit_logs'); setAuditPage(1); }}
            id="tab-audit-logs"
          >
            📋 Compliance Audit Logs
          </button>

          <button
            className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setNotifPage(1); }}
          >
            🔔 Notifications ({notifications.filter(n => !n.read).length})
          </button>

        </nav>

        {/* User profile */}
        <div className="sidebar-user">
          <div style={{ textAlign: 'left' }}>
            <div className="nav-user-name" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </div>
            <div className="nav-user-role">System Administrator</div>
          </div>
        </div>

      </aside>

      {/* Main Layout Container */}
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

        {/* Main Content Area */}
        <main className="sidebar-content">
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              {/* Metric grids */}
              {/* Metric grids */}
              <div className="analytics-grid" style={{ marginBottom: '2rem' }}>
                <div className="metric-card">
                  <div className="metric-icon">👥</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalParents}</span>
                    <span className="metric-label">Total Parents</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>👶</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalChildren}</span>
                    <span className="metric-label">Total Children</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--secondary)' }}>👩‍⚕️</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalPsychologists}</span>
                    <span className="metric-label">Psychologists</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--color-completed)' }}>✅</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalHandledCases}</span>
                    <span className="metric-label">Handled Cases</span>
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                
                {/* Average Turnaround Time */}
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏳ Avg Turnaround Time</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.5rem' }}>
                      {avgTurnaroundHours} hrs
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    Average duration from parent video upload to finalized clinical report.
                  </p>
                </div>

                {/* Case Abandonment rate */}
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📉 Case Abandonment Rate</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#b91c1c', marginTop: '0.5rem' }}>
                      {abandonmentRate}%
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    {abandonedCount} of {parentAccounts.length} parent accounts registered but never uploaded a case.
                  </p>
                </div>

                {/* Psychologist Load Breakdown */}
                <div className="card" style={{ padding: '1.5rem', gridRow: 'span 2' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>👩‍⚕️ Psychologist Loads</h4>
                  {psychologistLoads.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No active psychologists registered.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {psychologistLoads.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{p.count} active cases</span>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ background: p.count > 5 ? '#ef4444' : 'var(--primary)', width: `${Math.min(p.count * 20, 100)}%`, height: '100%' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Monthly handled cases SVG chart */}
              <div className="chart-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="chart-header">
                  <h3 className="chart-title">Monthly Handled Cases</h3>
                  <span className="chart-subtitle">Observation reports finalized and locked across last 6 months</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                  <svg width="100%" height="240" viewBox="0 0 450 240" style={{ overflow: 'visible' }}>
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const y = 30 + (1 - p) * 160;
                      const val = Math.round(p * maxMonthVal);
                      return (
                        <g key={idx}>
                          <line x1="40" y1={y} x2="430" y2={y} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                          <text x="30" y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}</text>
                        </g>
                      );
                    })}

                    {monthlyStats.map((item, idx) => {
                      const barWidth = 40;
                      const gap = 24;
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
            </div>
          )}

          {/* User Registry Tab */}
          {activeTab === 'accounts_list' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Accounts Registry ({totalAccounts})</h2>
                <button onClick={() => setActiveTab('accounts_create')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  ➕ Create New Account
                </button>
              </div>
              
              {accountMessage.text && (
                <div className={`alert alert-${accountMessage.type}`} id="account-alert">
                  <span>{accountMessage.type === 'error' ? '⚠️' : 'ℹ️'} {accountMessage.text}</span>
                </div>
              )}

              {totalAccounts === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>No registered accounts found.</p>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Toggle Status</th>
                          <th>Delete Account</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAccounts.map((acc) => (
                          <tr key={acc.id}>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{acc.full_name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{acc.email}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: acc.role === 'psychologist' ? 'var(--secondary)' : acc.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                {acc.role}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${acc.status}`}>
                                {acc.status}
                              </span>
                            </td>
                            <td>
                              {acc.role !== 'admin' ? (
                                <button
                                  onClick={() => handleToggleStatus(acc.id, acc.status)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={accountActionLoading}
                                >
                                  {acc.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Protected</span>
                              )}
                            </td>
                            <td>
                              {acc.role !== 'admin' ? (
                                <button
                                  onClick={() => handleDeleteUser(acc.id, acc.full_name)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                  disabled={accountActionLoading}
                                >
                                  🗑️ Delete
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Protected</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Accounts Pagination Bar */}
                  <div className="pagination-bar">
                    <div>
                      Showing {startAccIdx} to {endAccIdx} of {totalAccounts} accounts
                    </div>
                    <div className="pagination-controls">
                      <select
                        className="pagination-select"
                        value={accountsPageSize}
                        onChange={(e) => {
                          setAccountsPageSize(parseInt(e.target.value));
                          setAccountsPage(1);
                        }}
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                      </select>
                      <button
                        className="pagination-btn"
                        onClick={() => setAccountsPage(p => Math.max(p - 1, 1))}
                        disabled={accountsPage === 1}
                      >
                        Previous
                      </button>
                      <span style={{ margin: '0 0.5rem', fontWeight: 'bold' }}>
                        Page {accountsPage} of {totalAccountsPages}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => setAccountsPage(p => Math.min(p + 1, totalAccountsPages))}
                        disabled={accountsPage === totalAccountsPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Create User Tab */}
          {activeTab === 'accounts_create' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Register New User Profile</h2>
                
                {accountMessage.text && (
                  <div className={`alert alert-${accountMessage.type}`} id="account-alert">
                    <span>{accountMessage.type === 'error' ? '⚠️' : 'ℹ️'} {accountMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAccount}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-name-input">Full Name</label>
                    <input
                      type="text"
                      id="new-name-input"
                      className="form-input"
                      placeholder="e.g. Dr Sarah Smith"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      disabled={accountActionLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="new-email-input">Email Address</label>
                    <input
                      type="email"
                      id="new-email-input"
                      className="form-input"
                      placeholder="name@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      disabled={accountActionLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password-input">Password</label>
                    <input
                      type="password"
                      id="new-password-input"
                      className="form-input"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={accountActionLoading}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-role-select">Role</label>
                      <select
                        id="new-role-select"
                        className="form-select"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        disabled={accountActionLoading}
                      >
                        <option value="user">User / Parent</option>
                        <option value="psychologist">Clinical Psychologist</option>
                        <option value="admin">System Administrator</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="new-phone-input">Phone Number</label>
                      <input
                        type="text"
                        id="new-phone-input"
                        className="form-input"
                        placeholder="+65 9123 4567"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        disabled={accountActionLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={accountActionLoading}
                    id="btn-create-account"
                  >
                    {accountActionLoading ? <div className="spinner"></div> : 'Create Account'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Cases & Assignments Tab */}
          {activeTab === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Manual Reassign Form */}
              {reassignCaseId && (
                <section className="card" style={{ maxWidth: '600px', borderLeft: '4px solid var(--secondary)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Reassign Case Psychologist</h2>
                  
                  {caseMessage.text && (
                    <div className={`alert alert-${caseMessage.type}`} id="case-alert">
                      <span>{caseMessage.type === 'error' ? '⚠️' : 'ℹ️'} {caseMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleReassign} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label" htmlFor="reassign-select">Select Available Active Psychologist</label>
                      <select
                        id="reassign-select"
                        className="form-select"
                        value={reassignPsychologistId}
                        onChange={(e) => setReassignPsychologistId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Psychologist --</option>
                        {psychologists.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-secondary" disabled={caseActionLoading || !reassignPsychologistId}>
                        {caseActionLoading ? <div className="spinner"></div> : 'Confirm Assignment'}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setReassignCaseId('')}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Cases List */}
              <section className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>All Video Review Cases ({totalCases})</h2>
                
                {totalCases === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>No child cases uploaded yet.</p>
                ) : (
                  <>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Child details</th>
                            <th>Submitted By</th>
                            <th>Assigned Clinician</th>
                            <th>M-CHAT-R</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCases.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {c.child_name}
                                  {c.peer_review_requested && (
                                    <span className="badge badge-uploaded" style={{ background: '#fef3c7', color: '#d97706', fontSize: '0.65rem', border: '1px solid #fde68a', padding: '0.1rem 0.3rem' }}>
                                      Peer Review
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  Age: {c.child_age} yrs • {c.child_gender}
                                </div>
                              </td>
                              <td>
                                <div style={{ color: 'var(--text-primary)' }}>{c.parent?.full_name || 'Deleted Parent'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.parent?.email}</div>
                              </td>
                              <td>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                  {c.assigned_psychologist ? c.assigned_psychologist.full_name : '🚨 Unassigned'}
                                </div>
                                {c.assigned_psychologist && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.assigned_psychologist.email}</div>
                                )}
                              </td>
                              <td>
                                {c.mchat_score !== null ? (
                                  <span className={`badge badge-${getMchatBadgeClass(c.mchat_score)}`} style={{ fontSize: '0.7rem' }}>
                                    {getMchatRiskText(c.mchat_score)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>N/A</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge badge-${c.status}`}>
                                  {c.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleViewCaseReview(c)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                  >
                                    👁️ View Report
                                  </button>
                                  {c.status !== 'completed' && (
                                    <button
                                      onClick={() => {
                                        setReassignCaseId(c.id);
                                        setReassignPsychologistId(c.assigned_psychologist_id || '');
                                        setCaseMessage({ text: '', type: '' });
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                    >
                                      🔄 Reassign
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cases Pagination Bar */}
                    <div className="pagination-bar">
                      <div>
                        Showing {startCaseIdx} to {endCaseIdx} of {totalCases} cases
                      </div>
                      <div className="pagination-controls">
                        <select
                          className="pagination-select"
                          value={casesPageSize}
                          onChange={(e) => {
                            setCasesPageSize(parseInt(e.target.value));
                            setCasesPage(1);
                          }}
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>
                        <button
                          className="pagination-btn"
                          onClick={() => setCasesPage(p => Math.max(p - 1, 1))}
                          disabled={casesPage === 1}
                        >
                          Previous
                        </button>
                        <span style={{ margin: '0 0.5rem', fontWeight: 'bold' }}>
                          Page {casesPage} of {totalCasesPages}
                        </span>
                        <button
                          className="pagination-btn"
                          onClick={() => setCasesPage(p => Math.min(p + 1, totalCasesPages))}
                          disabled={casesPage === totalCasesPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>

            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>
              
              {/* Sidebar Case List with pagination */}
              <aside className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Select Case</h2>
                
                {totalCases === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                    No cases available.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {paginatedReviews.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleViewCaseReview(c)}
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
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Parent: {c.parent?.full_name || 'N/A'}
                        </div>
                      </button>
                    ))}

                    {/* Reviews Sidebar Pagination */}
                    <div className="pagination-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', border: 'none', padding: 0 }}>
                      <div style={{ fontSize: '0.75rem', textAlign: 'center', width: '100%' }}>
                        Showing {startRevIdx} to {endRevIdx} of {totalCases}
                      </div>
                      <div className="pagination-controls" style={{ justifyContent: 'center', width: '100%' }}>
                        <select
                          className="pagination-select"
                          value={reviewsPageSize}
                          onChange={(e) => {
                            setReviewsPageSize(parseInt(e.target.value));
                            setReviewsPage(1);
                          }}
                          style={{ padding: '0.2rem' }}
                        >
                          <option value={5}>5 / page</option>
                          <option value={10}>10 / page</option>
                        </select>
                        <button
                          className="pagination-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setReviewsPage(p => Math.max(p - 1, 1))}
                          disabled={reviewsPage === 1}
                        >
                          Prev
                        </button>
                        <span style={{ fontSize: '0.75rem' }}>
                          {reviewsPage} / {totalReviewsPages}
                        </span>
                        <button
                          className="pagination-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setReviewsPage(p => Math.min(p + 1, totalReviewsPages))}
                          disabled={reviewsPage === totalReviewsPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </aside>

              {/* Review Details & Override Panel */}
              <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {!selectedCase ? (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📺</div>
                    <h2>Select a Review File</h2>
                    <p style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>
                      Pick a case from the sidebar to inspect child video logs and edit psychologist assessment reviews.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Video Info Card */}
                    <div className="card" style={{ padding: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        Observations for {selectedCase.child_name} ({selectedCase.child_age} yrs, {selectedCase.child_gender})
                      </h2>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        Assigned Clinician: <strong>{selectedCase.assigned_psychologist?.full_name || 'None'}</strong>
                      </p>

                      {/* Display M-CHAT score details */}
                      {selectedCase.mchat_score !== null && (
                        <div style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                          <strong>Parent M-CHAT-R Screening score:</strong> <span className={`badge badge-${getMchatBadgeClass(selectedCase.mchat_score)}`} style={{ fontSize: '0.7rem' }}>{getMchatRiskText(selectedCase.mchat_score)}</span>
                        </div>
                      )}

                      {/* Video Player */}
                      <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {videoLoading ? (
                          <div className="spinner" style={{ width: '2.5rem', height: '2.5rem' }}></div>
                        ) : videoUrl ? (
                          <video ref={videoRef} src={videoUrl} controls style={{ width: '100%', maxHeight: '420px' }} />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Could not load secure video</span>
                        )}
                      </div>
                    </div>

                    {/* Interactive Video Annotations Panel */}
                    {videoUrl && (
                      <div className="annotations-panel">
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>📍 Timestamped Observations</h3>
                        
                        <div className="annotations-list">
                          {annotations.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                              No timestamped logs flagged for this case.
                            </div>
                          ) : (
                            annotations.map(ann => (
                              <div key={ann.id} className="annotation-badge">
                                <button
                                  className="annotation-time-seek"
                                  onClick={() => handleSeekVideo(ann.timestamp_seconds)}
                                >
                                  {formatTime(ann.timestamp_seconds)}
                                </button>
                                <span className="annotation-note-text">{ann.observation_note}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Q&A Conversation Panel */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>💬 Q&A thread oversight</h4>
                      
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
                                No messages in conversation thread.
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
                              placeholder="Type message..."
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

                    {/* Peer Review Comment Box */}
                    {selectedCase.peer_review_requested && (
                      <div className="card" style={{ padding: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <h4 style={{ fontSize: '1rem', color: '#b45309', margin: 0, marginBottom: '0.5rem' }}>⚠️ Peer Review Consult Requested</h4>
                        <p style={{ fontSize: '0.875rem', color: '#78350f', margin: 0, marginBottom: '1rem' }}>
                          <strong>Psychologist Reason/Notes:</strong> "{selectedCase.peer_review_notes}"
                        </p>
                        
                        {selectedCase.peer_review_feedback ? (
                          <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '4px', border: '1px solid #fcd34d', fontSize: '0.85rem', color: '#78350f' }}>
                            <strong>Your Peer Feedback:</strong> "{selectedCase.peer_review_feedback}"
                          </div>
                        ) : (
                          <form onSubmit={handleSubmitPeerFeedback}>
                            <div className="form-group">
                              <label className="form-label" htmlFor="peer-feedback-input" style={{ color: '#78350f', fontWeight: 'bold' }}>Senior Clinical Feedback</label>
                              <textarea
                                id="peer-feedback-input"
                                className="form-input"
                                style={{ minHeight: '80px', resize: 'vertical', background: '#fff', borderColor: '#fcd34d' }}
                                placeholder="Provide clinical feedback on this observation..."
                                value={peerFeedbackInput}
                                onChange={(e) => setPeerFeedbackInput(e.target.value)}
                                required
                                disabled={peerFeedbackSaving}
                              />
                            </div>
                            <button
                              type="submit"
                              className="btn btn-secondary"
                              style={{ background: '#d97706', color: '#fff', border: 'none' }}
                              disabled={peerFeedbackSaving || !peerFeedbackInput.trim()}
                            >
                              {peerFeedbackSaving ? 'Submitting...' : 'Submit Peer Review Comments'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Edit Form */}
                    <div className="card" style={{ padding: '1.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Manage Clinical Observations Report</h3>

                      {reviewMessage.text && (
                        <div className={`alert alert-${reviewMessage.type}`} id="admin-review-alert">
                          <span>{reviewMessage.type === 'error' ? '⚠️' : 'ℹ️'} {reviewMessage.text}</span>
                        </div>
                      )}

                      <form onSubmit={handleSaveReview}>
                        
                        {/* Standardized Rating Scale templates override */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                          <h4 style={{ gridColumn: '1 / -1', fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>📋 Milestone Scales (Admin Override)</h4>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="ja-select">Joint Attention</label>
                            <select
                              id="ja-select"
                              className="form-select"
                              value={jointAttention}
                              onChange={(e) => setJointAttention(e.target.value)}
                              disabled={reviewActionLoading}
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
                              disabled={reviewActionLoading}
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
                              disabled={reviewActionLoading}
                            >
                              <option value="Good/Consistent">Good/Consistent (typical)</option>
                              <option value="Inconsistent">Inconsistent</option>
                              <option value="Brief/Atypical">Brief/Atypical</option>
                              <option value="Avoidant/None">Avoidant/None</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="admin-obs">1. Behavioral Observations</label>
                          <textarea
                            id="admin-obs"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            required
                            disabled={reviewActionLoading}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="admin-summary">2. Summary / Assessment Comments</label>
                          <textarea
                            id="admin-summary"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            value={reviewSummary}
                            onChange={(e) => setReviewSummary(e.target.value)}
                            required
                            disabled={reviewActionLoading}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="admin-recs">3. Recommendations</label>
                          <textarea
                            id="admin-recs"
                            className="form-input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            value={recommendations}
                            onChange={(e) => setRecommendations(e.target.value)}
                            required
                            disabled={reviewActionLoading}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="admin-audit">4. Internal Audit Notes</label>
                          <textarea
                            id="admin-audit"
                            className="form-input"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            value={auditNotes}
                            onChange={(e) => setAuditNotes(e.target.value)}
                            disabled={reviewActionLoading}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center', marginTop: '1.5rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor="admin-status-select">Override Status</label>
                            <select
                              id="admin-status-select"
                              className="form-select"
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value)}
                              disabled={reviewActionLoading}
                              style={{ maxWidth: '240px' }}
                            >
                              <option value="draft">Draft (Mark as incomplete/under review)</option>
                              <option value="completed">Completed (Finalize & Lock)</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={reviewActionLoading}
                            id="btn-admin-save-review"
                          >
                            {reviewActionLoading ? <div className="spinner"></div> : 'Update Report Details'}
                          </button>
                        </div>
                      </form>
                    </div>

                  </>
                )}
              </main>

            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit_logs' && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>HIPAA HIPAA System Compliance Audit logs ({totalAudits})</h2>
              
              {totalAudits === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No compliance audit records found.</p>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Actor</th>
                          <th>Action</th>
                          <th>Child Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAudits.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {new Date(log.created_at).toLocaleDateString()} <br />
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.actor?.full_name || 'System / Auto'}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.actor?.email}</div>
                            </td>
                            <td>
                              <span className="badge badge-completed" style={{ background: log.action === 'viewed_video' ? 'var(--primary-glow)' : 'rgba(0,0,0,0.03)', color: log.action === 'viewed_video' ? 'var(--primary)' : 'var(--text-primary)' }}>
                                {log.action.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                {log.target_case?.child_name || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Audit Logs Pagination */}
                  <div className="pagination-bar">
                    <div>
                      Showing {startAuditIdx} to {endAuditIdx} of {totalAudits} logs
                    </div>
                    <div className="pagination-controls">
                      <select
                        className="pagination-select"
                        value={auditPageSize}
                        onChange={(e) => {
                          setAuditPageSize(parseInt(e.target.value));
                          setAuditPage(1);
                        }}
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                      </select>
                      <button
                        className="pagination-btn"
                        onClick={() => setAuditPage(p => Math.max(p - 1, 1))}
                        disabled={auditPage === 1}
                      >
                        Previous
                      </button>
                      <span style={{ margin: '0 0.5rem', fontWeight: 'bold' }}>
                        Page {auditPage} of {totalAuditPages}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => setAuditPage(p => Math.min(p + 1, totalAuditPages))}
                        disabled={auditPage === totalAuditPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Admin System Notifications History</h2>
                
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

          {/* Profile Settings Tab */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Admin Details Settings</h2>
                
                {adminProfileMessage.text && (
                  <div className={`alert alert-${adminProfileMessage.type}`} id="profile-alert" style={{ marginBottom: '1.25rem' }}>
                    <span>{adminProfileMessage.type === 'error' ? '⚠️' : 'ℹ️'} {adminProfileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateAdminProfile}>
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
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      required
                      disabled={adminProfileSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-phone">Contact Phone / Pager</label>
                    <input
                      type="text"
                      id="profile-phone"
                      className="form-input"
                      placeholder="+65 9123 4567"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      disabled={adminProfileSaving}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={adminProfileSaving || (adminFullName === profile.full_name && adminPhone === profile.phone)}
                    id="btn-update-profile"
                  >
                    {adminProfileSaving ? <div className="spinner"></div> : 'Update Profile Details'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>🔒 Security Settings (Change Password)</h3>

                {adminPasswordMessage.text && (
                  <div className={`alert alert-${adminPasswordMessage.type}`} id="password-alert" style={{ marginBottom: '1.25rem' }}>
                    <span>{adminPasswordMessage.type === 'error' ? '⚠️' : 'ℹ️'} {adminPasswordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateAdminPassword}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-pwd">New Password</label>
                    <input
                      type="password"
                      id="new-pwd"
                      className="form-input"
                      placeholder="Min 6 characters"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      required
                      disabled={adminPasswordSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-pwd">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirm-pwd"
                      className="form-input"
                      placeholder="Repeat new password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      required
                      disabled={adminPasswordSaving}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={adminPasswordSaving || !adminNewPassword || !adminConfirmPassword}
                    id="btn-update-password"
                  >
                    {adminPasswordSaving ? <div className="spinner"></div> : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
