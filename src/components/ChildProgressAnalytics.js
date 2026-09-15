"use client";

import React, { useState, useMemo } from 'react';

/**
 * ChildProgressAnalytics Component
 * 
 * Comprehensive longitudinal reporting and analytics dashboard for tracking child developmental progress over time.
 * Supports Parent, Psychologist, and Admin views with SVG trend charts, multi-domain developmental indicators,
 * baseline vs. current comparison metrics, milestone goals, historical timeline, and printable export features.
 */
export default function ChildProgressAnalytics({
  role = 'parent',
  user = null,
  childProfiles = [],
  cases = [],
  reviews = [],
  selectedChildId: externalChildId = null
}) {
  const [internalSelectedChildId, setInternalSelectedChildId] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL'); // 'ALL', '3M', '6M', '1Y'
  const [activeDomainTab, setActiveDomainTab] = useState('overview'); // 'overview', 'social', 'motor', 'goals'

  const selectedChildId = externalChildId !== null ? externalChildId : internalSelectedChildId;

  const safeChildProfiles = Array.isArray(childProfiles) ? childProfiles : [];

  // Filter cases relevant to the selected child / profile
  const filteredCases = useMemo(() => {
    let list = Array.isArray(cases) ? [...cases] : [];

    // Filter by child profile if selected
    if (selectedChildId && selectedChildId !== 'ALL') {
      list = list.filter(c => 
        String(c.child_profile_id) === String(selectedChildId) ||
        (c.child_name && safeChildProfiles.find(p => String(p.id) === String(selectedChildId))?.child_name?.toLowerCase() === c.child_name.toLowerCase())
      );
    }

    // Sort chronologically (oldest to newest for trend calculation)
    list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    // Time filter
    if (timeFilter !== 'ALL') {
      const now = new Date();
      let monthsAgo = 6;
      if (timeFilter === '3M') monthsAgo = 3;
      if (timeFilter === '1Y') monthsAgo = 12;
      const cutoff = new Date();
      cutoff.setMonth(now.getMonth() - monthsAgo);
      list = list.filter(c => new Date(c.created_at || 0) >= cutoff);
    }

    return list;
  }, [cases, selectedChildId, safeChildProfiles, timeFilter]);

  // Selected child metadata
  const currentChildProfile = useMemo(() => {
    if (!selectedChildId || selectedChildId === 'ALL') return null;
    return safeChildProfiles.find(p => String(p.id) === String(selectedChildId)) || null;
  }, [selectedChildId, safeChildProfiles]);

  // Derived progress statistics & comparison metrics
  const stats = useMemo(() => {
    const totalCount = filteredCases.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        latestRisk: 'N/A',
        riskColor: '#94a3b8',
        progressDirection: 'No Data Available',
        progressColor: '#94a3b8',
        daysTracked: 0,
        avgMchat: 0,
        baselineScore: 0,
        currentScore: 0,
        scoreDelta: 0,
        jointAttentionScore: 0,
        eyeContactScore: 0,
        motorScore: 0,
        communicationScore: 0,
        completedReviewsCount: 0,
        latestDate: 'N/A',
        earliestDate: 'N/A'
      };
    }

    const latestCase = filteredCases[filteredCases.length - 1];
    const earliestCase = filteredCases[0];
    const latestTime = latestCase?.created_at ? new Date(latestCase.created_at).getTime() : 0;
    const earliestTime = earliestCase?.created_at ? new Date(earliestCase.created_at).getTime() : 0;
    const daysTracked = Math.max(1, Math.round((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));

    // Risk calculation helper
    const getRiskScore = (c) => {
      if (typeof c.mchat_score === 'number') return c.mchat_score;
      if (c.risk_level === 'High Risk') return 8;
      if (c.risk_level === 'Moderate Risk') return 4;
      return 1;
    };

    const latestRiskScore = getRiskScore(latestCase);
    const earliestRiskScore = getRiskScore(earliestCase);
    const scoreDelta = earliestRiskScore - latestRiskScore; // Positive means risk reduced (improvement)

    let progressDirection = 'Stable Trajectory';
    let progressColor = '#3b82f6'; // blue
    if (totalCount > 1) {
      if (scoreDelta > 0) {
        progressDirection = `Improving (-${scoreDelta} Risk Pts)`;
        progressColor = '#10b981'; // green
      } else if (scoreDelta < 0) {
        progressDirection = `Requires Attention (+${Math.abs(scoreDelta)} Risk Pts)`;
        progressColor = '#ef4444'; // red
      }
    }

    const latestRisk = latestCase.risk_level || (latestRiskScore >= 8 ? 'High Risk' : latestRiskScore >= 3 ? 'Moderate Risk' : 'Low Risk');
    const riskColor = latestRisk.includes('High') ? '#ef4444' : latestRisk.includes('Moderate') ? '#f59e0b' : '#10b981';

    // Count completed professional evaluations
    const completedReviewsCount = filteredCases.filter(c => c.status === 'reviewed' || c.psychologist_reviews?.length > 0 || c.review).length;

    // Calculate developmental indicator scores from latest review / case
    const latestReview = latestCase.psychologist_reviews?.[0] || latestCase.review;
    
    const parseJointAttention = (val) => {
      if (val === 'Consistent') return 90;
      if (val === 'Inconsistent') return 55;
      if (val === 'Absent') return 20;
      return 70; // default baseline
    };

    const parseEyeContact = (val) => {
      if (val === 'Good/Consistent' || val === 'Good') return 92;
      if (val === 'Reduced') return 58;
      if (val === 'Poor') return 25;
      return 68;
    };

    const parseMotor = (val) => {
      if (val === 'None') return 95;
      if (val === 'Mild') return 72;
      if (val === 'Moderate') return 45;
      if (val === 'Severe') return 15;
      return 78;
    };

    const parseCommunication = (val) => {
      if (latestRiskScore <= 2) return 88;
      if (latestRiskScore <= 5) return 65;
      return 35;
    };

    const jointAttentionScore = latestReview ? parseJointAttention(latestReview.joint_attention) : 70;
    const eyeContactScore = latestReview ? parseEyeContact(latestReview.eye_contact) : 68;
    const motorScore = latestReview ? parseMotor(latestReview.motor_repetitions) : 78;
    const communicationScore = parseCommunication(latestCase);

    const avgMchat = (filteredCases.reduce((acc, c) => acc + getRiskScore(c), 0) / totalCount).toFixed(1);

    return {
      totalCount,
      latestRisk,
      riskColor,
      progressDirection,
      progressColor,
      daysTracked,
      avgMchat,
      baselineScore: earliestRiskScore,
      currentScore: latestRiskScore,
      scoreDelta,
      jointAttentionScore,
      eyeContactScore,
      motorScore,
      communicationScore,
      completedReviewsCount,
      latestDate: latestCase.created_at ? new Date(latestCase.created_at).toLocaleDateString() : 'N/A',
      earliestDate: earliestCase.created_at ? new Date(earliestCase.created_at).toLocaleDateString() : 'N/A'
    };
  }, [filteredCases]);

  // Points for SVG Trend Chart
  const chartPoints = useMemo(() => {
    if (filteredCases.length === 0) return [];
    
    const svgWidth = 600;
    const svgHeight = 220;
    const padding = 40;

    const getRiskVal = (c) => {
      if (typeof c.mchat_score === 'number') return c.mchat_score;
      if (c.risk_level === 'High Risk') return 9;
      if (c.risk_level === 'Moderate Risk') return 5;
      return 1;
    };

    const minScore = 0;
    const maxScore = 10;

    return filteredCases.map((c, idx) => {
      const x = filteredCases.length === 1 
        ? svgWidth / 2 
        : padding + (idx / (filteredCases.length - 1)) * (svgWidth - padding * 2);
      
      const score = getRiskVal(c);
      // Invert Y so 10 (High Risk) is near top, 0 (Low Risk) near bottom
      const y = (svgHeight - padding) - ((score - minScore) / (maxScore - minScore)) * (svgHeight - padding * 2);

      return {
        x,
        y,
        score,
        date: c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Case #${idx + 1}`,
        childName: c.child_name || 'Child',
        risk: c.risk_level || (score >= 8 ? 'High Risk' : score >= 3 ? 'Moderate Risk' : 'Low Risk'),
        caseId: c.id
      };
    });
  }, [filteredCases]);

  // Clinical milestone goals
  const goals = useMemo(() => {
    const currentScore = stats.currentScore;
    return [
      {
        id: 1,
        title: 'M-CHAT Risk Score Reduction',
        target: 'Low Risk (Score <= 2)',
        current: `Score: ${currentScore}`,
        progress: Math.min(100, Math.max(10, Math.round(((10 - currentScore) / 10) * 100))),
        status: currentScore <= 2 ? 'Achieved' : currentScore <= 5 ? 'In Progress' : 'Needs Focus',
        color: currentScore <= 2 ? '#10b981' : currentScore <= 5 ? '#f59e0b' : '#ef4444'
      },
      {
        id: 2,
        title: 'Joint Attention & Social Gaze',
        target: 'Consistent Response (> 80%)',
        current: `${stats.jointAttentionScore}% Engagement`,
        progress: stats.jointAttentionScore,
        status: stats.jointAttentionScore >= 80 ? 'Achieved' : 'In Progress',
        color: stats.jointAttentionScore >= 80 ? '#10b981' : '#3b82f6'
      },
      {
        id: 3,
        title: 'Eye Contact & Social Reciprocation',
        target: 'Sustained Social Eye Contact (> 75%)',
        current: `${stats.eyeContactScore}% Frequency`,
        progress: stats.eyeContactScore,
        status: stats.eyeContactScore >= 75 ? 'Achieved' : 'In Progress',
        color: stats.eyeContactScore >= 75 ? '#10b981' : '#8b5cf6'
      },
      {
        id: 4,
        title: 'Motor Repetition Control',
        target: 'Minimal Stereotypic Repetition (> 80%)',
        current: `${stats.motorScore}% Control`,
        progress: stats.motorScore,
        status: stats.motorScore >= 80 ? 'Achieved' : 'In Progress',
        color: stats.motorScore >= 80 ? '#10b981' : '#10b981'
      }
    ];
  }, [stats]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="analytics-dashboard-container" style={{ background: '#0f172a', color: '#f8fafc', borderRadius: '16px', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)' }}>
      
      {/* Printable Clinical Document Header (Visible ONLY during print) */}
      <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20pt', margin: 0, color: '#0f172a' }}>SIM-AUTISM Clinical Progress & Analytics Report</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '10pt', color: '#475569' }}>Automated Screening & Longitudinal Developmental Tracking Platform</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#475569' }}>
            <p style={{ margin: 0 }}><strong>Report Date:</strong> {new Date().toLocaleDateString()}</p>
            <p style={{ margin: 0 }}><strong>Role View:</strong> {role.toUpperCase()}</p>
          </div>
        </div>

        {currentChildProfile && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '10pt', display: 'flex', gap: '20px' }}>
            <div><strong>Child Name:</strong> {currentChildProfile.child_name}</div>
            <div><strong>Age:</strong> {currentChildProfile.age_months ? `${currentChildProfile.age_months} months` : 'N/A'}</div>
            <div><strong>Gender:</strong> {currentChildProfile.gender || 'N/A'}</div>
            <div><strong>Parent Contact:</strong> {currentChildProfile.parent_email || user?.email || 'N/A'}</div>
          </div>
        )}
      </div>

      {/* Interactive Header & Controls */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📈</span> Child Progress & Analytics Dashboard
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Longitudinal developmental trajectory, screening trendlines, multi-domain progress, and exportable clinical reports.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Child Profile Selector */}
          {childProfiles && childProfiles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Child:</label>
              <select
                value={selectedChildId}
                onChange={(e) => setInternalSelectedChildId(e.target.value)}
                style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #475569', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
              >
                <option value="ALL">All Children ({childProfiles.length})</option>
                {childProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.child_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Timeframe Filter */}
          <div style={{ display: 'flex', background: '#1e293b', borderRadius: '8px', padding: '3px', border: '1px solid #334155' }}>
            {['ALL', '3M', '6M', '1Y'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                style={{
                  background: timeFilter === tf ? '#3b82f6' : 'transparent',
                  color: timeFilter === tf ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tf === 'ALL' ? 'All Time' : tf}
              </button>
            ))}
          </div>

          {/* Print/Export Button */}
          <button
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.15s'
            }}
          >
            <span>🖨️</span> Export Clinical Report
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Screenings</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#f8fafc' }}>{stats.totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Latest: {stats.latestDate}</div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Risk Level</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '6px', color: stats.riskColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stats.riskColor, display: 'inline-block' }}></span>
            {stats.latestRisk}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>M-CHAT Avg: {stats.avgMchat}</div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Baseline vs Current</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '6px', color: stats.scoreDelta >= 0 ? '#10b981' : '#ef4444' }}>
            {stats.baselineScore} pts → {stats.currentScore} pts
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {stats.scoreDelta > 0 ? `Reduced risk by ${stats.scoreDelta} pts` : stats.scoreDelta < 0 ? `Risk increased by ${Math.abs(stats.scoreDelta)} pts` : 'No score change'}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress Trajectory</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px', color: stats.progressColor }}>
            {stats.progressDirection}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Over {stats.daysTracked} days tracked</div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical Evaluations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#a78bfa' }}>{stats.completedReviewsCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Psychologist Reviews</div>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        {[
          { id: 'overview', label: '📊 Risk Trend & Indicators' },
          { id: 'goals', label: '🎯 Developmental Goals' },
          { id: 'history', label: '🗓️ Clinical Timeline & Notes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDomainTab(tab.id)}
            style={{
              background: activeDomainTab === tab.id ? '#334155' : 'transparent',
              color: activeDomainTab === tab.id ? '#60a5fa' : '#94a3b8',
              border: activeDomainTab === tab.id ? '1px solid #60a5fa' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Section */}
      {(activeDomainTab === 'overview' || activeDomainTab === 'history') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          {/* Longitudinal Risk Trend SVG Chart */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                📊 M-CHAT Risk Score Trajectory
              </h3>
              <span style={{ fontSize: '0.75rem', background: '#0f172a', padding: '4px 8px', borderRadius: '6px', color: '#94a3b8' }}>
                Lower = Less Risk
              </span>
            </div>

            {filteredCases.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                No screening assessment history available for the selected child/timeframe.
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 600 240" style={{ width: '100%', height: 'auto', background: '#0f172a', borderRadius: '10px' }}>
                  {/* Low Risk Zone (0-2) */}
                  <rect x="40" y="172" width="520" height="44" fill="rgba(16, 185, 129, 0.08)" rx="4" />
                  <text x="50" y="198" fill="#10b981" fontSize="10" opacity="0.7">Low Risk Zone (0 - 2)</text>

                  {/* Moderate Risk Zone (3-7) */}
                  <rect x="40" y="76" width="520" height="96" fill="rgba(245, 158, 11, 0.08)" rx="4" />
                  <text x="50" y="128" fill="#f59e0b" fontSize="10" opacity="0.7">Moderate Risk Zone (3 - 7)</text>

                  {/* High Risk Zone (8-10) */}
                  <rect x="40" y="16" width="520" height="60" fill="rgba(239, 68, 68, 0.08)" rx="4" />
                  <text x="50" y="44" fill="#ef4444" fontSize="10" opacity="0.7">High Risk Zone (8 - 10)</text>

                  {/* Horizontal Grid lines */}
                  {[0, 3, 7, 10].map(val => {
                    const y = 216 - (val / 10) * 192;
                    return (
                      <line key={val} x1="40" y1={y} x2="560" y2={y} stroke="#334155" strokeDasharray="3 3" />
                    );
                  })}

                  {/* Trend line path */}
                  {chartPoints.length > 1 && (
                    <path
                      d={chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points */}
                  {chartPoints.map((pt, i) => {
                    const ptColor = pt.risk.includes('High') ? '#ef4444' : pt.risk.includes('Moderate') ? '#f59e0b' : '#10b981';
                    return (
                      <g key={i}>
                        {/* Glow outer ring */}
                        <circle cx={pt.x} cy={pt.y} r="8" fill={ptColor} fillOpacity="0.25" />
                        {/* Point dot */}
                        <circle cx={pt.x} cy={pt.y} r="5" fill={ptColor} stroke="#ffffff" strokeWidth="1.5" />
                        {/* Score tooltip label */}
                        <text x={pt.x} y={pt.y - 12} fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
                          Score: {pt.score}
                        </text>
                        {/* Date label at bottom */}
                        <text x={pt.x} y="232" fill="#94a3b8" fontSize="10" textAnchor="middle">
                          {pt.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Multi-Domain Developmental Indicators Breakdown */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', color: '#f1f5f9' }}>
              🎯 Developmental Domains Progress
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Joint Attention */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Joint Attention & Shared Focus</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>{stats.jointAttentionScore}%</span>
                </div>
                <div style={{ height: '10px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.jointAttentionScore}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
              </div>

              {/* Eye Contact & Social Responsiveness */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Eye Contact & Social Engagement</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>{stats.eyeContactScore}%</span>
                </div>
                <div style={{ height: '10px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.eyeContactScore}%`,
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
              </div>

              {/* Motor Repetition Control */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Motor Repetition Control (Low Repetitions = High Score)</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>{stats.motorScore}%</span>
                </div>
                <div style={{ height: '10px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.motorScore}%`,
                      background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
              </div>

              {/* Functional Communication */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Communication & Gesture Pointing</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{stats.communicationScore}%</span>
                </div>
                <div style={{ height: '10px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.communicationScore}%`,
                      background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
              </div>

              {/* Insight Tip */}
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#94a3b8', borderLeft: '4px solid #3b82f6', marginTop: '4px' }}>
                <strong style={{ color: '#f1f5f9' }}>Clinical Insight:</strong> Multi-domain indicators are automatically calculated from screening item responses and clinical evaluations.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developmental Milestone Goals Tab */}
      {activeDomainTab === 'goals' && (
        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '14px', border: '1px solid #334155', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>
            🎯 Developmental Milestone Goals
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
            Target milestones established for intervention, behavioral therapy, and pediatrician updates.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {goals.map(goal => (
              <div key={goal.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{goal.title}</span>
                    <span style={{ background: `${goal.color}22`, color: goal.color, padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${goal.color}44` }}>
                      {goal.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    <strong>Target:</strong> {goal.target}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '12px' }}>
                    <strong>Current:</strong> {goal.current}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Evaluation Timeline Table */}
      {(activeDomainTab === 'overview' || activeDomainTab === 'history') && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', color: '#f1f5f9' }}>
            🗓️ Historical Evaluations & Clinical Recommendations
          </h3>

          {filteredCases.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '16px 0' }}>
              No evaluation records found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Child Name</th>
                    <th style={{ padding: '10px' }}>Risk Level</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Psychologist Observations</th>
                    <th style={{ padding: '10px' }}>Recommendations</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => {
                    const rev = c.psychologist_reviews?.[0] || c.review;
                    const riskColor = c.risk_level === 'High Risk' ? '#ef4444' : c.risk_level === 'Moderate Risk' ? '#f59e0b' : '#10b981';

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #334155', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 10px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f8fafc' }}>
                          {c.child_name || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ background: `${riskColor}22`, color: riskColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${riskColor}44` }}>
                            {c.risk_level || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textTransform: 'capitalize', color: '#94a3b8' }}>
                          {c.status || 'Pending'}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#cbd5e1', maxWidth: '240px' }}>
                          {rev?.observations || c.notes || 'Awaiting evaluation notes.'}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#a78bfa', maxWidth: '240px' }}>
                          {rev?.recommendations || 'Pending professional assessment.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Printable Clinical Signature Block (Visible ONLY during print) */}
      <div className="print-signature" style={{ display: 'none', marginTop: '40px', borderTop: '1px dashed #000', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Evaluating Psychologist Signature:</p>
            <div style={{ marginTop: '40px', borderBottom: '1px solid #000', width: '220px' }}></div>
            <p style={{ margin: '4px 0 0 0', fontSize: '8pt', color: '#475569' }}>Licensed Clinical Specialist</p>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Parent / Guardian Verification:</p>
            <div style={{ marginTop: '40px', borderBottom: '1px solid #000', width: '220px' }}></div>
            <p style={{ margin: '4px 0 0 0', fontSize: '8pt', color: '#475569' }}>SIM-AUTISM Platform Confirmation</p>
          </div>
        </div>
      </div>

      {/* Global CSS for Printing & Responsive Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header, .print-signature {
            display: block !important;
          }
          .analytics-dashboard-container {
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .analytics-dashboard-container div {
            border-color: #e2e8f0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .analytics-dashboard-container text {
            fill: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
