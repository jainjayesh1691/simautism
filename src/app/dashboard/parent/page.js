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

export default function ParentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('cases'); // 'cases', 'submit', 'profile', 'notifications'
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Submit Wizard Steps: 1 = Consent, 2 = M-CHAT, 3 = Case Info & Upload
  const [submitStep, setSubmitStep] = useState(1);

  // Step 1: Consent States
  const [consentDisclaimer, setConsentDisclaimer] = useState(false);
  const [consentRetention, setConsentRetention] = useState(false);
  const [signature, setSignature] = useState('');

  // Step 2: M-CHAT States
  const [mchatAnswers, setMchatAnswers] = useState({});

  // Step 3: Case Form States
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childGender, setChildGender] = useState('Male');
  const [notes, setNotes] = useState('');
  const [childHistory, setChildHistory] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitMessage, setSubmitMessage] = useState({ text: '', type: '' });

  // Cases Pagination States
  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(5);

  // Notifications Pagination States
  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(5);

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

  // Child Profile & Resource Library States
  const [childProfiles, setChildProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [newChildDOB, setNewChildDOB] = useState('');
  const [newChildGender, setNewChildGender] = useState('Male');
  const [newChildHistory, setNewChildHistory] = useState('');
  const [savingChildProfile, setSavingChildProfile] = useState(false);
  const [childProfileMessage, setChildProfileMessage] = useState({ text: '', type: '' });
  const [resourceLibrary, setResourceLibrary] = useState([]);

  // Edit Child Profile States
  const [editingChildProfile, setEditingChildProfile] = useState(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildDOB, setEditChildDOB] = useState('');
  const [editChildGender, setEditChildGender] = useState('Male');
  const [editChildHistory, setEditChildHistory] = useState('');
  const [updatingChildProfile, setUpdatingChildProfile] = useState(false);

  // Video playback & seeking
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const videoRef = useRef(null);

  const formatTime = (secs) => {
    if (secs === undefined || secs === null || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeekVideo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleTimelineClick = (e) => {
    if (!videoRef.current || !videoDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * videoDuration;
    videoRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
  };

  const getActiveAnnotationForCase = (annotations) => {
    if (!annotations || annotations.length === 0) return null;
    const sorted = [...annotations].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    
    let active = null;
    for (let i = 0; i < sorted.length; i++) {
      const ann = sorted[i];
      const nextAnn = sorted[i + 1];
      const displayDuration = 6; // Display active comment for 6 seconds
      const endTime = nextAnn ? nextAnn.timestamp_seconds : ann.timestamp_seconds + displayDuration;
      
      if (videoCurrentTime >= ann.timestamp_seconds && videoCurrentTime < endTime) {
        active = ann;
        break;
      }
    }
    return active;
  };

  useEffect(() => {
    setVideoDuration(0);
    setVideoCurrentTime(0);
  }, [activeVideoId]);

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
          assigned_psychologist:assigned_psychologist_id (
            full_name,
            email
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      const casesWithReviews = await Promise.all(casesData.map(async (c) => {
        let reviewData = null;
        if (c.status === 'completed') {
          const { data } = await supabase
            .from('psychologist_reviews')
            .select('*')
            .eq('case_id', c.id)
            .eq('status', 'completed')
            .maybeSingle();
          reviewData = data;
        }

        const { data: annotationsData } = await supabase
          .from('video_annotations')
          .select('*')
          .eq('case_id', c.id)
          .order('timestamp_seconds', { ascending: true });

        return { ...c, review: reviewData, annotations: annotationsData || [] };
      }));

      setCases(casesWithReviews);
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

  const fetchChildProfiles = useCallback(async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('user_id', profileId)
        .order('name', { ascending: true });
      if (error) throw error;
      setChildProfiles(data || []);
    } catch (err) {
      console.error('Error fetching child profiles:', err);
    }
  }, []);

  const fetchResourceLibrary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resource_library')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      setResourceLibrary(data || []);
    } catch (err) {
      console.error('Error fetching resource library:', err);
    }
  }, []);

  const handleCreateChildProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSavingChildProfile(true);
    setChildProfileMessage({ text: '', type: '' });
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .insert({
          user_id: profile.id,
          name: newChildName,
          date_of_birth: newChildDOB || null,
          gender: newChildGender,
          developmental_history: newChildHistory || null
        })
        .select()
        .single();

      if (error) throw error;
      setChildProfileMessage({ text: 'Child profile created successfully!', type: 'success' });
      setNewChildName('');
      setNewChildDOB('');
      setNewChildGender('Male');
      setNewChildHistory('');
      await fetchChildProfiles(profile.id);
      setTimeout(() => setChildProfileMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setChildProfileMessage({ text: err.message || 'Failed to create child profile.', type: 'error' });
    } finally {
      setSavingChildProfile(false);
    }
  };

  const handleOpenEditChildModal = (child) => {
    setEditingChildProfile(child);
    setEditChildName(child.name || '');
    setEditChildDOB(child.date_of_birth ? child.date_of_birth.substring(0, 10) : '');
    setEditChildGender(child.gender || 'Male');
    setEditChildHistory(child.developmental_history || '');
  };

  const handleCloseEditChildModal = () => {
    setEditingChildProfile(null);
    setEditChildName('');
    setEditChildDOB('');
    setEditChildGender('Male');
    setEditChildHistory('');
  };

  const handleUpdateChildProfile = async (e) => {
    e.preventDefault();
    if (!editingChildProfile || !profile) return;

    setUpdatingChildProfile(true);
    setChildProfileMessage({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('child_profiles')
        .update({
          name: editChildName,
          date_of_birth: editChildDOB || null,
          gender: editChildGender,
          developmental_history: editChildHistory || null
        })
        .eq('id', editingChildProfile.id);

      if (error) throw error;

      setChildProfileMessage({ text: 'Child profile updated successfully!', type: 'success' });
      handleCloseEditChildModal();
      await fetchChildProfiles(profile.id);
      setTimeout(() => setChildProfileMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setChildProfileMessage({ text: err.message || 'Failed to update child profile.', type: 'error' });
    } finally {
      setUpdatingChildProfile(false);
    }
  };

  const handleDeleteChildProfile = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the profile for ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('child_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChildProfileMessage({ text: 'Child profile deleted.', type: 'success' });
      await fetchChildProfiles(profile.id);
      setTimeout(() => setChildProfileMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      alert('Failed to delete child profile: ' + err.message);
    }
  };

  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId);
    if (!profileId) {
      setChildName('');
      setChildGender('Male');
      setChildHistory('');
      setChildAge('');
      return;
    }
    const selected = childProfiles.find(p => p.id === profileId);
    if (selected) {
      setChildName(selected.name);
      setChildGender(selected.gender || 'Male');
      setChildHistory(selected.developmental_history || '');
      
      // Calculate age if DOB is present
      if (selected.date_of_birth) {
        const dob = new Date(selected.date_of_birth);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        const years = Math.abs(ageDate.getUTCFullYear() - 1970);
        const months = ageDate.getUTCMonth();
        const computedAge = parseFloat((years + months / 12).toFixed(1));
        setChildAge(computedAge.toString());
      } else {
        setChildAge('');
      }
    }
  };

  const handleDownloadPDF = (c) => {
    if (!c || !c.review) return;
    
    // Fetch matched resources based on deficits
    const matchedResources = resourceLibrary.filter(r => 
      c.review.deficits && c.review.deficits.includes(r.category)
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download report PDFs.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Clinical Observation Assessment Report - ${c.child_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #0f172a;
              line-height: 1.5;
              padding: 2rem;
              margin: 0;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 1rem;
              margin-bottom: 2rem;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-family: 'Outfit', sans-serif;
              font-size: 1.75rem;
              font-weight: 700;
              color: #059669;
            }
            .title {
              font-family: 'Outfit', sans-serif;
              font-size: 2rem;
              font-weight: 800;
              margin-top: 0;
              margin-bottom: 0.5rem;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1rem;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 1.25rem;
              margin-bottom: 2rem;
            }
            .meta-item {
              font-size: 0.9rem;
            }
            .meta-item strong {
              color: #475569;
            }
            .section-title {
              font-family: 'Outfit', sans-serif;
              font-size: 1.25rem;
              font-weight: 700;
              color: #0d9488;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 0.5rem;
              margin-top: 2rem;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
              margin-bottom: 1.5rem;
            }
            .metric-card {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 6px;
              padding: 1rem;
              text-align: center;
            }
            .metric-val {
              font-size: 1.1rem;
              font-weight: 700;
              color: #059669;
              margin-top: 0.25rem;
            }
            .content-block {
              font-size: 0.95rem;
              color: #334155;
              white-space: pre-wrap;
              margin-bottom: 1.5rem;
            }
            .badge {
              display: inline-block;
              padding: 0.35rem 0.75rem;
              border-radius: 9999px;
              font-size: 0.8rem;
              font-weight: 600;
              background: #dbeafe;
              color: #1e40af;
              text-transform: uppercase;
            }
            .disclaimer {
              background: #fffbeb;
              border: 1px solid #fef3c7;
              color: #92400e;
              padding: 1.25rem;
              border-radius: 8px;
              font-size: 0.825rem;
              margin-top: 3rem;
            }
            .resource-card {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 1rem;
              margin-bottom: 1rem;
              background: #fafafa;
            }
            .resource-title {
              font-weight: 600;
              color: #0f172a;
              margin-bottom: 0.25rem;
            }
            .resource-desc {
              font-size: 0.85rem;
              color: #64748b;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="brand">🧩 SimAutism</div>
            <div class="no-print">
              <button onclick="window.print();" style="background:#059669;color:#fff;border:none;padding:0.5rem 1rem;font-weight:600;border-radius:4px;cursor:pointer;">Print / Save PDF</button>
            </div>
          </div>

          <h1 class="title">Clinical Observation Assessment Report</h1>
          <div style="font-size:0.95rem;color:#64748b;margin-bottom:1.5rem;">Case Reference: ${c.id}</div>

          <div class="meta-grid">
            <div class="meta-item"><strong>Child Name:</strong> ${c.child_name}</div>
            <div class="meta-item"><strong>Date of Birth / Age:</strong> ${c.child_age} years</div>
            <div class="meta-item"><strong>Gender:</strong> ${c.child_gender}</div>
            <div class="meta-item"><strong>Date of Review:</strong> ${new Date(c.review.updated_at).toLocaleDateString()}</div>
            <div class="meta-item"><strong>M-CHAT-R Risk Level:</strong> <span class="badge">${c.mchat_score !== null ? (c.mchat_score <= 2 ? 'Low Risk' : c.mchat_score <= 7 ? 'Medium Risk' : 'High Risk') + ' (' + c.mchat_score + '/10)' : 'N/A'}</span></div>
          </div>

          <div class="section-title">Standardized Milestone Observations</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div style="font-size:0.8rem;color:#64748b;font-weight:600;">Joint Attention</div>
              <div class="metric-val">${c.review.joint_attention || 'N/A'}</div>
            </div>
            <div class="metric-card">
              <div style="font-size:0.8rem;color:#64748b;font-weight:600;">Motor Repetitions</div>
              <div class="metric-val">${c.review.motor_repetitions || 'N/A'}</div>
            </div>
            <div class="metric-card">
              <div style="font-size:0.8rem;color:#64748b;font-weight:600;">Eye Contact</div>
              <div class="metric-val">${c.review.eye_contact || 'N/A'}</div>
            </div>
          </div>

          ${c.annotations && c.annotations.length > 0 ? `
            <div class="section-title">Timestamped Video Observations</div>
            <div style="margin-bottom: 1.5rem;">
              ${c.annotations.map(a => `
                <div style="display:flex;gap:0.75rem;margin-bottom:0.4rem;font-size:0.9rem;">
                  <strong style="color:#059669;min-width:65px;">[${formatTime(a.timestamp_seconds)}]</strong>
                  <span>${a.observation_note}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="section-title">Detailed Behavioral Observations</div>
          <div class="content-block">${c.review.observations || 'No observations detailed.'}</div>

          <div class="section-title">Observation Summary</div>
          <div class="content-block">${c.review.review_summary || 'No summary detailed.'}</div>

          <div class="section-title">Recommendations & Recommended Guidance</div>
          <div class="content-block">${c.review.recommendations || 'No recommendations detailed.'}</div>

          ${matchedResources.length > 0 ? `
            <div class="section-title">Attached Reading Materials & Resources</div>
            <div>
              ${matchedResources.map(r => `
                <div class="resource-card">
                  <div class="resource-title">${r.title}</div>
                  <div class="resource-desc">${r.description}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="disclaimer">
            <strong>⚠️ Clinical Observation Disclaimer:</strong> This platform is designed solely for observation hosting and psychologist review support. It does not offer automated diagnostics. Official autism spectrum diagnosis must be verified through clinical sessions with qualified medical professionals.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

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

      if (profileData.role !== 'user') {
        router.push('/login');
        return;
      }

      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setPhone(profileData.phone || '');

      await Promise.all([
        fetchCases(profileData.id),
        fetchAllNotifications(profileData.id),
        fetchChildProfiles(profileData.id),
        fetchResourceLibrary()
      ]);
      setLoading(false);
    };

    getSession();
  }, [router, fetchCases, fetchAllNotifications, fetchChildProfiles, fetchResourceLibrary]);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 524288000) {
      setSubmitMessage({ text: 'Video file size must be less than 500MB.', type: 'error' });
      setVideoFile(null);
      e.target.value = null;
      return;
    }

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      setSubmitMessage({ text: 'Invalid file format. Please upload MP4, MOV, or WEBM video.', type: 'error' });
      setVideoFile(null);
      e.target.value = null;
      return;
    }

    setVideoFile(file);
    setSubmitMessage({ text: '', type: '' });
  };

  // Submit Case Form (with M-CHAT-R score and consent indicators)
  const handleSubmitCase = async (e) => {
    e.preventDefault();
    if (!videoFile || !profile) return;

    setSubmitting(true);
    setUploadProgress(0);
    setSubmitMessage({ text: 'Uploading observation video securely...', type: 'info' });

    try {
      const caseId = crypto.randomUUID();
      const fileExt = videoFile.name.split('.').pop();
      const storagePath = `${user.id}/${caseId}/video.${fileExt}`;

      // 1. Resumable chunked upload configuration
      const { error: uploadError } = await supabase.storage
        .from('child-videos')
        .upload(storagePath, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);
      setSubmitMessage({ text: 'Saving questionnaire responses & registering case file...', type: 'info' });

      // Calculate M-CHAT score
      let score = 0;
      MCHAT_QUESTIONS.forEach((q) => {
        const parentAns = mchatAnswers[q.id];
        if (parentAns === q.atypicalVal) {
          score += 1;
        }
      });

      // 2. Insert case record
      const { error: insertError } = await supabase
        .from('child_cases')
        .insert({
          id: caseId,
          user_id: profile.id,
          child_name: childName,
          child_age: parseFloat(childAge),
          child_gender: childGender,
          notes_from_parent: notes || null,
          child_history: childHistory || null,
          video_path: storagePath,
          video_url: null,
          status: 'uploaded',
          consent_given: true,
          mchat_score: score,
          mchat_responses: mchatAnswers,
          child_profile_id: selectedProfileId || null
        });

      if (insertError) {
        await supabase.storage.from('child-videos').remove([storagePath]);
        throw insertError;
      }

      setUploadProgress(100);
      setSubmitMessage({ text: `Case submitted successfully! M-CHAT Risk Score: ${score}/10. AI Evaluator is being assigned.`, type: 'success' });
      
      // Reset form
      setSelectedProfileId('');
      setChildName('');
      setChildAge('');
      setChildGender('Male');
      setNotes('');
      setChildHistory('');
      setVideoFile(null);
      setMchatAnswers({});
      setConsentDisclaimer(false);
      setConsentRetention(false);
      setSignature('');
      setSubmitStep(1);

      const fileInput = document.getElementById('video-input');
      if (fileInput) fileInput.value = '';

      await fetchCases(profile.id);
      setTimeout(() => {
        setSubmitMessage({ text: '', type: '' });
        setActiveTab('cases');
      }, 3000);
    } catch (err) {
      console.error(err);
      setSubmitMessage({ text: err.message || 'Failed to submit case.', type: 'error' });
    } finally {
      setSubmitting(false);
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

  const handlePlayVideo = async (caseId, videoPath) => {
    if (activeVideoId === caseId) {
      setActiveVideoId('');
      setActiveVideoUrl('');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('child-videos')
        .createSignedUrl(videoPath, 300);

      if (error) throw error;

      setActiveVideoId(caseId);
      setActiveVideoUrl(data.signedUrl);

      // Log Viewed Video Audit Log
      await supabase.rpc('log_audit_action', { p_case_id: caseId, p_action: 'viewed_video' });
    } catch (err) {
      alert('Failed to load video: ' + err.message);
    }
  };

  // Secure Chat Messaging Thread
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

  // Set up realtime chat message receiver
  useEffect(() => {
    if (!viewingChatCaseId) return;

    const channel = supabase
      .channel('chat-changes')
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

  // Scroll to bottom of chat
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

  const getMchatBadgeClass = (score) => {
    if (score <= 2) return 'completed';
    if (score <= 7) return 'review';
    return 'uploaded';
  };

  // Metric Ribbon Math
  const totalCases = cases.length;
  const completedCases = cases.filter(c => c.status === 'completed').length;
  const pendingCases = totalCases - completedCases;

  // Case Pagination Math
  const totalCasesPages = Math.ceil(totalCases / casesPageSize) || 1;
  const paginatedCases = cases.slice((casesPage - 1) * casesPageSize, casesPage * casesPageSize);
  const startCaseIdx = totalCases === 0 ? 0 : (casesPage - 1) * casesPageSize + 1;
  const endCaseIdx = Math.min(casesPage * casesPageSize, totalCases);

  // Notification Pagination Math
  const totalNotifs = notifications.length;
  const totalNotifPages = Math.ceil(totalNotifs / notifPageSize) || 1;
  const paginatedNotifs = notifications.slice((notifPage - 1) * notifPageSize, notifPage * notifPageSize);
  const startNotifIdx = totalNotifs === 0 ? 0 : (notifPage - 1) * notifPageSize + 1;
  const endNotifIdx = Math.min(notifPage * notifPageSize, totalNotifs);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'submit': return 'Submit Case (Step ' + submitStep + ' of 3)';
      case 'children': return 'Registered Children Profiles';
      case 'profile': return 'My Profile Information';
      case 'security': return 'Security & Password';
      case 'notifications': return 'All Notifications';
      default: return 'Cases Overview';
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
      
      {/* Left Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* Brand */}
        <div className="sidebar-brand logo-section">
          <div className="logo-icon">🧩</div>
          <div className="logo-text">SimAutism</div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => { setActiveTab('cases'); setCasesPage(1); }}
          >
            📂 Cases Overview
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'children' ? 'active' : ''}`}
            onClick={() => setActiveTab('children')}
          >
            👶 Child Profiles
          </button>

          <button
            className={`sidebar-link ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('submit'); setSubmitStep(1); }}
          >
            📹 Submit New Case
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setNotifPage(1); }}
          >
            🔔 Notifications ({notifications.filter(n => !n.read).length})
          </button>
        </nav>

        {/* User Details at Bottom */}
        <div className="sidebar-user">
          <div style={{ textAlign: 'left' }}>
            <div className="nav-user-name" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </div>
            <div className="nav-user-role">Parent Account</div>
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
          
          {/* Cases Tab */}
          {activeTab === 'cases' && (
            <div>
              {/* Metrics Ribbon */}
              <div className="analytics-grid">
                <div className="metric-card">
                  <div className="metric-icon">📂</div>
                  <div className="metric-info">
                    <span className="metric-value">{totalCases}</span>
                    <span className="metric-label">Total Cases</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ color: 'var(--color-completed)', background: 'rgba(5, 150, 105, 0.1)' }}>🩺</div>
                  <div className="metric-info">
                    <span className="metric-value">{completedCases}</span>
                    <span className="metric-label">Reviewed</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ color: 'var(--color-review)', background: 'rgba(245, 158, 11, 0.1)' }}>⏳</div>
                  <div className="metric-info">
                    <span className="metric-value">{pendingCases}</span>
                    <span className="metric-label">Pending</span>
                  </div>
                </div>
              </div>

              {/* Cases List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {totalCases === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <h3>No Cases Submitted</h3>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Select "Submit New Case" in the left sidebar to upload developmental videos.
                    </p>
                  </div>
                ) : (
                  <>
                    {paginatedCases.map((c) => (
                      <div className="card" key={c.id} style={{ padding: '1.75rem' }}>
                        
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.3rem' }}>{c.child_name}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {c.child_gender}, {c.child_age} yrs • Submitted {new Date(c.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {c.mchat_score !== null && (
                              <span className={`badge badge-${getMchatBadgeClass(c.mchat_score)}`} style={{ fontSize: '0.7rem' }}>
                                M-CHAT-R: {getMchatRiskText(c.mchat_score)}
                              </span>
                            )}
                            <span className={`badge badge-${c.status}`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Developmental History */}
                        {c.child_history && (
                          <div style={{ margin: '0.75rem 0', padding: '0.75rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Developmental History:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>{c.child_history}</p>
                          </div>
                        )}

                        {/* Case Notes */}
                        {c.notes_from_parent && (
                          <div style={{ margin: '0.75rem 0', padding: '0.75rem', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Parent Observations:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>{c.notes_from_parent}</p>
                          </div>
                        )}

                        {/* Interactive Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                          <button
                            onClick={() => handlePlayVideo(c.id, c.video_path)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            📺 {activeVideoId === c.id ? 'Close Video Player' : 'View Secure Video'}
                          </button>

                          <button
                            onClick={() => handleOpenChat(c.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            💬 {viewingChatCaseId === c.id ? 'Close Q&A Thread' : 'Open Q&A Thread'}
                          </button>
                        </div>

                        {/* Video Player & Timewise Observations Split Layout */}
                        {activeVideoId === c.id && activeVideoUrl && (
                          <div style={{
                            margin: '1.5rem 0',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '1.5rem',
                            borderRadius: '12px',
                            overflow: 'hidden'
                          }}>
                            {/* Keyframe animation and highlight utility rules */}
                            <style dangerouslySetInnerHTML={{ __html: `
                              @keyframes fadeInUp {
                                from {
                                  opacity: 0;
                                  transform: translate(-50%, 10px);
                                }
                                to {
                                  opacity: 1;
                                  transform: translate(-50%, 0);
                                }
                              }
                              .observation-card-highlight {
                                border-color: #fbbf24 !important;
                                background-color: rgba(251, 191, 36, 0.08) !important;
                                box-shadow: 0 0 10px rgba(251, 191, 36, 0.25) !important;
                                transform: scale(1.02);
                              }
                              @media (min-width: 992px) {
                                .video-split-grid {
                                  grid-template-columns: 7fr 5fr !important;
                                }
                              }
                            ` }} />

                            <div className="video-split-grid" style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr',
                              gap: '1.5rem',
                              gridColumn: '1 / -1'
                            }}>
                              
                              {/* Left Column: Video & Draggable Timeline */}
                              <div style={{
                                background: '#0f172a',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                              }}>
                                
                                {/* Video Wrapper */}
                                <div style={{ position: 'relative', width: '100%', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                  <video
                                    ref={videoRef}
                                    src={activeVideoUrl}
                                    controls
                                    onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
                                    onTimeUpdate={(e) => {
                                      const curTime = e.target.currentTime;
                                      setVideoCurrentTime(curTime);
                                      
                                      // Auto scroll active comment card in the list
                                      if (c.annotations && c.annotations.length > 0) {
                                        const sorted = [...c.annotations].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
                                        let active = null;
                                        for (let i = 0; i < sorted.length; i++) {
                                          const ann = sorted[i];
                                          const nextAnn = sorted[i + 1];
                                          const endTime = nextAnn ? nextAnn.timestamp_seconds : ann.timestamp_seconds + 6;
                                          if (curTime >= ann.timestamp_seconds && curTime < endTime) {
                                            active = ann;
                                            break;
                                          }
                                        }
                                        if (active) {
                                          const el = document.getElementById(`comment-card-${active.id}`);
                                          if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                          }
                                        }
                                      }
                                    }}
                                    style={{ width: '100%', maxHeight: '380px', display: 'block' }}
                                  />

                                  {/* Active Comment Subtitle Overlay */}
                                  {(() => {
                                    const active = getActiveAnnotationForCase(c.annotations);
                                    if (!active) return null;
                                    return (
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '60px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid rgba(251, 191, 36, 0.4)',
                                        borderRadius: '30px',
                                        padding: '0.6rem 1.25rem',
                                        color: '#ffffff',
                                        fontSize: '0.85rem',
                                        fontWeight: '500',
                                        textAlign: 'center',
                                        maxWidth: '85%',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        animation: 'fadeInUp 0.3s ease-out',
                                      }}>
                                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>⏱️ {formatTime(active.timestamp_seconds)}:</span>
                                        <span>{active.observation_note}</span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Custom Draggable Timeline Progress Bar */}
                                {videoDuration > 0 && (
                                  <div style={{ padding: '0.75rem 1.25rem', background: '#1e293b', borderTop: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                      <span style={{ fontWeight: '500' }}>AI Observation Markers ({c.annotations?.length || 0})</span>
                                      <span style={{ fontFamily: 'monospace' }}>{formatTime(videoCurrentTime)} / {formatTime(videoDuration)}</span>
                                    </div>
                                    
                                    {/* Visual Progress Timeline Container */}
                                    <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
                                      
                                      {/* Background Track & Fill */}
                                      <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        height: '8px',
                                        background: '#475569',
                                        borderRadius: '4px',
                                        pointerEvents: 'none'
                                      }}>
                                        <div style={{
                                          height: '100%',
                                          width: `${(videoCurrentTime / videoDuration) * 100}%`,
                                          background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)',
                                          borderRadius: '4px',
                                        }} />
                                      </div>

                                      {/* Native Input Slider (Invisible, layered for dragging support) */}
                                      <input
                                        type="range"
                                        min={0}
                                        max={videoDuration}
                                        step="0.05"
                                        value={videoCurrentTime}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          videoRef.current.currentTime = val;
                                          setVideoCurrentTime(val);
                                        }}
                                        style={{
                                          position: 'absolute',
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          opacity: 0,
                                          cursor: 'pointer',
                                          zIndex: 5,
                                        }}
                                      />

                                      {/* Visual Interactive Marker Dots */}
                                      {c.annotations && c.annotations.map(ann => {
                                        const pct = (ann.timestamp_seconds / videoDuration) * 100;
                                        if (pct < 0 || pct > 100) return null;
                                        
                                        const activeAnn = getActiveAnnotationForCase(c.annotations);
                                        const isActive = activeAnn && activeAnn.id === ann.id;
                                        
                                        return (
                                          <div
                                            key={ann.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSeekVideo(ann.timestamp_seconds);
                                            }}
                                            style={{
                                              position: 'absolute',
                                              left: `${pct}%`,
                                              top: '50%',
                                              transform: 'translate(-50%, -50%)',
                                              width: isActive ? '16px' : '12px',
                                              height: isActive ? '16px' : '12px',
                                              borderRadius: '50%',
                                              background: isActive ? '#fbbf24' : '#f59e0b',
                                              border: '2px solid #ffffff',
                                              boxShadow: isActive ? '0 0 12px #fbbf24' : '0 0 8px rgba(245, 158, 11, 0.8)',
                                              cursor: 'pointer',
                                              zIndex: 10,
                                              transition: 'transform 0.15s, background-color 0.15s, width 0.15s, height 0.15s',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.4)';
                                              const tooltip = document.getElementById(`tooltip-${ann.id}`);
                                              if (tooltip) {
                                                tooltip.style.opacity = '1';
                                                tooltip.style.transform = 'translate(-50%, -100%) translateY(-8px)';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                                              const tooltip = document.getElementById(`tooltip-${ann.id}`);
                                              if (tooltip) {
                                                tooltip.style.opacity = '0';
                                                tooltip.style.transform = 'translate(-50%, -100%) translateY(0px)';
                                              }
                                            }}
                                          >
                                            {/* Tooltip Popup */}
                                            <div
                                              id={`tooltip-${ann.id}`}
                                              style={{
                                                position: 'absolute',
                                                left: '50%',
                                                top: 0,
                                                transform: 'translate(-50%, -100%) translateY(0px)',
                                                opacity: 0,
                                                pointerEvents: 'none',
                                                background: 'rgba(15, 23, 42, 0.95)',
                                                backdropFilter: 'blur(4px)',
                                                color: '#ffffff',
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                whiteSpace: 'normal',
                                                minWidth: '150px',
                                                maxWidth: '220px',
                                                textAlign: 'center',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                border: '1px solid #334155',
                                                zIndex: 100,
                                                transition: 'opacity 0.2s, transform 0.2s',
                                              }}
                                            >
                                              <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '2px' }}>
                                                {formatTime(ann.timestamp_seconds)}
                                              </div>
                                              <div>{ann.observation_note}</div>
                                              <div style={{
                                                position: 'absolute',
                                                bottom: '-6px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 0,
                                                height: 0,
                                                borderLeft: '6px solid transparent',
                                                borderRight: '6px solid transparent',
                                                borderTop: '6px solid rgba(15, 23, 42, 0.95)',
                                              }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: AI Video Observations List & Audio Transcription */}
                              <div style={{
                                background: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                maxHeight: '430px'
                              }}>
                                
                                {/* Right Panel Scrollable Area */}
                                <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  
                                  {/* AI Observations List */}
                                  <div>
                                    <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      ⏱️ AI Timewise Video Observations
                                    </h4>

                                    {(!c.annotations || c.annotations.length === 0) ? (
                                      <div style={{ fontSize: '0.825rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.25rem 0' }}>
                                        No specific timestamped video flags added yet for this recording.
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {c.annotations.map(ann => {
                                          const activeAnn = getActiveAnnotationForCase(c.annotations);
                                          const isActive = activeAnn && activeAnn.id === ann.id;
                                          
                                          return (
                                            <div
                                              key={ann.id}
                                              id={`comment-card-${ann.id}`}
                                              onClick={() => handleSeekVideo(ann.timestamp_seconds)}
                                              className={isActive ? 'observation-card-highlight' : ''}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem',
                                                background: '#0f172a',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid #334155',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease-in-out'
                                              }}
                                              onMouseEnter={(e) => {
                                                if (!isActive) {
                                                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                if (!isActive) {
                                                  e.currentTarget.style.borderColor = '#334155';
                                                  e.currentTarget.style.transform = 'none';
                                                }
                                              }}
                                            >
                                              <span
                                                style={{
                                                  background: isActive ? '#fbbf24' : '#0284c7',
                                                  color: isActive ? '#0f172a' : '#fff',
                                                  padding: '0.25rem 0.5rem',
                                                  borderRadius: '6px',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 'bold',
                                                  whiteSpace: 'nowrap',
                                                  display: 'inline-block'
                                                }}
                                              >
                                                ▶ {formatTime(ann.timestamp_seconds)}
                                              </span>
                                              <span style={{ fontSize: '0.85rem', color: '#f1f5f9', lineHeight: '1.4' }}>
                                                {ann.observation_note}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Whisper Dialogue Audio Transcript */}
                                  {c.transcription && (
                                    <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                                      <h5 style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: '0 0 0.75rem 0' }}>
                                        🎙️ Timestamped Dialogue Transcript (AI Whisper)
                                      </h5>
                                      
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {c.transcription.split('\n').map((line, idx) => {
                                          const match = line.match(/^\[([\d.]+)\]\s+\[([\d:]+)\]\s+(.+)$/);
                                          if (!match) return <div key={idx} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{line}</div>;
                                          
                                          const timestampVal = parseFloat(match[1]);
                                          const isLineActive = Math.abs(videoCurrentTime - timestampVal) < 2;

                                          return (
                                            <div
                                              key={idx}
                                              onClick={() => handleSeekVideo(timestampVal)}
                                              style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                fontSize: '0.8rem',
                                                alignItems: 'flex-start',
                                                cursor: 'pointer',
                                                padding: '0.25rem',
                                                borderRadius: '4px',
                                                background: isLineActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                                transition: 'background 0.2s'
                                              }}
                                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                              onMouseLeave={(e) => e.currentTarget.style.background = isLineActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent'}
                                            >
                                              <span
                                                style={{
                                                  background: isLineActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.15)',
                                                  color: isLineActive ? '#0f172a' : '#38bdf8',
                                                  padding: '0.15rem 0.45rem',
                                                  borderRadius: '4px',
                                                  fontSize: '0.7rem',
                                                  fontWeight: 'bold',
                                                  whiteSpace: 'nowrap'
                                                }}
                                              >
                                                {match[2]}
                                              </span>
                                              <span style={{ color: isLineActive ? '#ffffff' : '#cbd5e1', lineHeight: '1.4' }}>
                                                {match[3]}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        )}

                        {/* Secure messaging chat panel */}
                        {viewingChatCaseId === c.id && (
                          <div style={{ margin: '1rem 0' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>💬 Q&A messaging with AI Evaluator</h4>
                            
                            <div className="chat-thread">
                              <div className="chat-messages">
                                {chatLoading ? (
                                  <div style={{ textAlign: 'center', margin: 'auto' }} className="spinner"></div>
                                ) : chatMessages.length === 0 ? (
                                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No messages yet. Ask the clinician a question about your child's review.
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
                                  placeholder="Type your message here..."
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
                          </div>
                        )}

                        {/* Psychologist Observation feedback report */}
                        {c.status === 'completed' && c.review && (
                          <div style={{
                            marginTop: '1.25rem',
                            padding: '1.25rem',
                            background: 'rgba(5, 150, 105, 0.05)',
                            border: '1px solid rgba(5, 150, 105, 0.15)',
                            borderRadius: '8px',
                            fontSize: '0.925rem'
                          }}>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              🩺 Clinical Observation Feedback Report
                            </h4>

                            {/* Standardized Milestones */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                              <div><strong>Joint Attention:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{c.review.joint_attention || 'Not Evaluated'}</span></div>
                              <div><strong>Motor Repetitions:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{c.review.motor_repetitions || 'Not Evaluated'}</span></div>
                              <div><strong>Eye Contact:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{c.review.eye_contact || 'Not Evaluated'}</span></div>
                            </div>
                            
                            {/* Timewise Video Observations Breakdown */}
                            {c.annotations && c.annotations.length > 0 && (
                              <div style={{ margin: '1rem 0', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                                <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                                  ⏱️ Timewise Video Observations Timeline
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {c.annotations.map(ann => (
                                    <div key={ann.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (activeVideoId !== c.id) {
                                            handlePlayVideo(c.id, c.video_path);
                                          }
                                          setTimeout(() => handleSeekVideo(ann.timestamp_seconds), 300);
                                        }}
                                        style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                                        title="Click to play video at this timestamp"
                                      >
                                        ▶ {formatTime(ann.timestamp_seconds)}
                                      </button>
                                      <span style={{ color: 'var(--text-primary)' }}>{ann.observation_note}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div style={{ marginBottom: '0.75rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>BEHAVIORAL OBSERVATIONS:</span>
                              <p style={{ color: 'var(--text-primary)' }}>{c.review.observations || 'N/A'}</p>
                            </div>

                            <div style={{ marginBottom: '0.75rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>OBSERVATION SUMMARY:</span>
                              <p style={{ color: 'var(--text-primary)' }}>{c.review.review_summary || 'N/A'}</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', display: 'block' }}>RECOMMENDATIONS & NEXT STEPS:</span>
                              <p style={{ color: 'var(--text-primary)' }}>{c.review.recommendations || 'N/A'}</p>
                            </div>

                            {/* Download PDF button */}
                            <button
                              onClick={() => handleDownloadPDF(c)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1.25rem', width: 'auto' }}
                            >
                              📄 Download PDF Report
                            </button>

                            {/* Smart Resource Library Matches */}
                            {c.review.deficits && c.review.deficits.length > 0 && (
                              <div style={{ marginTop: '1.25rem', borderTop: '1px dashed rgba(5, 150, 105, 0.25)', paddingTop: '1rem' }}>
                                <h5 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 'bold' }}>📚 Attached Smart Guidance & Resources</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                  {resourceLibrary.filter(r => c.review.deficits.includes(r.category)).map(res => (
                                    <div key={res.id} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem' }}>
                                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>{res.title}</strong>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Category: {res.category}</span>
                                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>{res.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#047857', fontStyle: 'italic', borderTop: '1px solid rgba(5, 150, 105, 0.15)', paddingTop: '0.5rem' }}>
                              Note: This feedback represents clinical observation comments only and is not an official autism diagnosis. Expired media purging rules apply 30 days post completion.
                            </div>
                          </div>
                        )}

                      </div>
                    ))}

                    {/* Pagination Bar */}
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
              </div>
            </div>
          )}

          {/* Child Profiles Tab */}
          {activeTab === 'children' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Create profile form */}
                <div className="card">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>👶 Add New Child Profile</h3>
                  
                  {childProfileMessage.text && (
                    <div className={`alert alert-${childProfileMessage.type}`}>
                      <span>{childProfileMessage.type === 'error' ? '⚠️' : 'ℹ️'} {childProfileMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateChildProfile}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="child-profile-name">Full Name</label>
                      <input
                        type="text"
                        id="child-profile-name"
                        className="form-input"
                        placeholder="Child's Name"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        required
                        disabled={savingChildProfile}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="child-profile-dob">Date of Birth</label>
                        <input
                          type="date"
                          id="child-profile-dob"
                          className="form-input"
                          value={newChildDOB}
                          onChange={(e) => setNewChildDOB(e.target.value)}
                          disabled={savingChildProfile}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="child-profile-gender">Gender</label>
                        <select
                          id="child-profile-gender"
                          className="form-select"
                          value={newChildGender}
                          onChange={(e) => setNewChildGender(e.target.value)}
                          disabled={savingChildProfile}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="child-profile-history">Developmental History</label>
                      <textarea
                        id="child-profile-history"
                        className="form-input"
                        style={{ minHeight: '120px', resize: 'vertical' }}
                        placeholder="Describe milestones reached, health concerns, family history..."
                        value={newChildHistory}
                        onChange={(e) => setNewChildHistory(e.target.value)}
                        disabled={savingChildProfile}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.5rem' }}
                      disabled={savingChildProfile || !newChildName.trim()}
                    >
                      {savingChildProfile ? <div className="spinner"></div> : 'Create Child Profile'}
                    </button>
                  </form>
                </div>

                {/* Profiles list */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>👶 Registered Children Profiles</h3>
                  
                  {childProfiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👶</div>
                      <p style={{ fontSize: '0.9rem' }}>No children profiles registered yet. Add a profile on the left.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {childProfiles.map(p => {
                        // Calculate age
                        let ageText = 'N/A';
                        if (p.date_of_birth) {
                          const dob = new Date(p.date_of_birth);
                          const ageDifMs = Date.now() - dob.getTime();
                          const ageDate = new Date(ageDifMs);
                          const years = Math.abs(ageDate.getUTCFullYear() - 1970);
                          const months = ageDate.getUTCMonth();
                          ageText = `${years} yrs ${months} mos`;
                        }
                        return (
                          <div key={p.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'rgba(0,0,0,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge badge-assigned" style={{ fontSize: '0.7rem' }}>{p.gender}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditChildModal(p)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                  title="Edit Child Profile"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChildProfile(p.id, p.name)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                  title="Delete Child Profile"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              Date of Birth: {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : 'N/A'} ({ageText})
                            </div>
                            {p.developmental_history && (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>
                                <strong>History:</strong> {p.developmental_history}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Tab (Wizard Flow) */}
          {activeTab === 'submit' && (
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              
              {/* Step indicator header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
                {['Consent & Signature', 'M-CHAT Screening', 'Upload Details'].map((stepName, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', opacity: submitStep === i + 1 ? 1 : 0.4 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: submitStep >= i + 1 ? 'var(--primary)' : 'rgba(0,0,0,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{stepName}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                {submitMessage.text && (
                  <div className={`alert alert-${submitMessage.type}`} id="submit-alert">
                    <span>{submitMessage.type === 'error' ? '⚠️' : 'ℹ️'} {submitMessage.text}</span>
                  </div>
                )}

                {/* STEP 1: Consent Form */}
                {submitStep === 1 && (
                  <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Digital Consent & Data Agreement</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                      SimAutism uses private storage to host developmental clinical video reviews. In accordance with health data compliance rules, please verify and consent to the terms below before submitting your video files:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      <label className="q-option-label" style={{ alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={consentDisclaimer}
                          onChange={(e) => setConsentDisclaimer(e.target.checked)}
                          style={{ marginTop: '3px' }}
                        />
                        <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                          I understand that these clinical video reviews represent observational evaluations and **do not** constitute an official, automated medical diagnosis.
                        </span>
                      </label>

                      <label className="q-option-label" style={{ alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={consentRetention}
                          onChange={(e) => setConsentRetention(e.target.checked)}
                          style={{ marginTop: '3px' }}
                        />
                        <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                          I acknowledge that the video file will be permanently purged from the secure system storage bucket exactly **30 days after the case is marked completed** to protect privacy.
                        </span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="signature-input">E-Signature (Type Full Name)</label>
                      <input
                        type="text"
                        id="signature-input"
                        className="form-input"
                        placeholder="John Doe"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.5rem' }}
                      disabled={!consentDisclaimer || !consentRetention || !signature.trim()}
                      onClick={() => setSubmitStep(2)}
                    >
                      Acknowledge & Continue
                    </button>
                  </div>
                )}

                {/* STEP 2: M-CHAT screening */}
                {submitStep === 2 && (
                  <div>
                    <h3 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)' }}>M-CHAT-R Screening Checklist</h3>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Please answer the following standard child developmental screening questions to provide clinical context:
                    </p>

                    <div className="q-box" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {MCHAT_QUESTIONS.map((q) => (
                        <div className="q-item" key={q.id}>
                          <div className="q-question">{q.id}. {q.text}</div>
                          <div className="q-options">
                            <label className="q-option-label">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value="Yes"
                                checked={mchatAnswers[q.id] === 'Yes'}
                                onChange={() => setMchatAnswers(prev => ({ ...prev, [q.id]: 'Yes' }))}
                              />
                              Yes
                            </label>
                            <label className="q-option-label">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value="No"
                                checked={mchatAnswers[q.id] === 'No'}
                                onChange={() => setMchatAnswers(prev => ({ ...prev, [q.id]: 'No' }))}
                              />
                              No
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={() => setSubmitStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={Object.keys(mchatAnswers).length < MCHAT_QUESTIONS.length}
                        onClick={() => setSubmitStep(3)}
                      >
                        Confirm Questionnaire
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Upload and case details */}
                {submitStep === 3 && (
                  <form onSubmit={handleSubmitCase}>
                    <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Child Case & Video Upload</h3>

                    <div className="form-group">
                      <label className="form-label" htmlFor="child-profile-select">Select Child Profile</label>
                      <select
                        id="child-profile-select"
                        className="form-select"
                        value={selectedProfileId}
                        onChange={(e) => handleSelectProfile(e.target.value)}
                        required
                        disabled={submitting}
                      >
                        <option value="">-- Choose Child Profile --</option>
                        {childProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {childProfiles.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginTop: '0.5rem' }}>
                          ⚠️ You must create a child profile in the "Child Profiles" tab before submitting a case.
                        </p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="child-name">Child's Full Name</label>
                      <input
                        type="text"
                        id="child-name"
                        className="form-input"
                        placeholder="Select profile first"
                        value={childName}
                        disabled
                        required
                        style={{ background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="child-age">Age (Confirmed Years)</label>
                        <input
                          type="number"
                          id="child-age"
                          className="form-input"
                          placeholder="e.g. 3.5"
                          step="0.1"
                          min="0"
                          max="25"
                          value={childAge}
                          onChange={(e) => setChildAge(e.target.value)}
                          required
                          disabled={submitting || !selectedProfileId}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="child-gender">Gender</label>
                        <input
                          type="text"
                          id="child-gender"
                          className="form-input"
                          value={childGender}
                          disabled
                          required
                          style={{ background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="child-history-input">Child Developmental History</label>
                      <textarea
                        id="child-history-input"
                        className="form-input"
                        style={{ minHeight: '100px', resize: 'vertical', background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                        placeholder="Prefilled from child profile"
                        value={childHistory}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="child-notes">Immediate Observations / Parent Notes</label>
                      <textarea
                        id="child-notes"
                        className="form-input"
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        placeholder="Describe specific behavioral features..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="video-input">Video File (MP4, MOV, WEBM - Max 500MB)</label>
                      <input
                        type="file"
                        id="video-input"
                        className="form-input"
                        accept="video/mp4, video/quicktime, video/webm"
                        onChange={handleFileChange}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={() => setSubmitStep(2)}
                        disabled={submitting}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={submitting || !videoFile}
                        id="btn-upload-submit"
                      >
                        {submitting ? <div className="spinner"></div> : 'Upload & Submit Case'}
                      </button>
                    </div>
                  </form>
                )}

              </div>
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
                    <label className="form-label" htmlFor="profile-phone">Phone Number</label>
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

          {/* Security Tab */}
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

      {/* Edit Child Profile Modal */}
      {editingChildProfile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              ✏️ Edit Child Profile: {editingChildProfile.name}
            </h3>

            <form onSubmit={handleUpdateChildProfile}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-child-name">Full Name</label>
                <input
                  type="text"
                  id="edit-child-name"
                  className="form-input"
                  value={editChildName}
                  onChange={(e) => setEditChildName(e.target.value)}
                  required
                  disabled={updatingChildProfile}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-child-dob">Date of Birth</label>
                  <input
                    type="date"
                    id="edit-child-dob"
                    className="form-input"
                    value={editChildDOB}
                    onChange={(e) => setEditChildDOB(e.target.value)}
                    disabled={updatingChildProfile}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-child-gender">Gender</label>
                  <select
                    id="edit-child-gender"
                    className="form-select"
                    value={editChildGender}
                    onChange={(e) => setEditChildGender(e.target.value)}
                    disabled={updatingChildProfile}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-child-history">Developmental History</label>
                <textarea
                  id="edit-child-history"
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={editChildHistory}
                  onChange={(e) => setEditChildHistory(e.target.value)}
                  disabled={updatingChildProfile}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseEditChildModal}
                  disabled={updatingChildProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingChildProfile || !editChildName.trim()}
                >
                  {updatingChildProfile ? <div className="spinner"></div> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
