"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotificationCenter({ profileId, onViewAll }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const formatNotification = (n) => {
    if (!n) return n;
    let title = n.title;
    let message = n.message;
    
    if (title === 'Case Assigned') {
      title = 'AI Case Assigned';
    } else if (title === 'Case Reassigned') {
      title = 'AI Case Reassigned';
    } else if (title === 'Observations Report Completed') {
      title = 'AI Observations Completed';
    }
    
    if (message) {
      message = message.replace(/assigned to\s+.+?(\.|\s*$)/i, 'assigned to AI Evaluator.');
      message = message.replace(/reassigned to\s+.+?(\.|\s*$)/i, 'reassigned to AI Evaluator.');
      message = message.replace(/The psychologist has/gi, 'AI Evaluator has');
    }
    
    return { ...n, title, message };
  };

  const fetchNotifications = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(8); // Show last 8 in dropdown

      if (error) throw error;
      setNotifications((data || []).map(formatNotification));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [profileId]);

  useEffect(() => {
    fetchNotifications();

    // Set up Realtime subscription to receive instant updates when notifications are inserted!
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`
        },
        (payload) => {
          // Prepend new notification
          setNotifications(prev => [formatNotification(payload.new), ...prev]);
        }
      )
      .subscribe();

    // Close dropdown on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileId, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profileId)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          borderRadius: '50%',
          transition: 'var(--transition)'
        }}
        id="btn-notification-bell"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--color-error)',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-main)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.75rem',
          width: '320px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.8rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.02)'
          }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  padding: 0
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: n.read ? 'transparent' : 'var(--primary-glow)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'var(--transition)',
                    position: 'relative'
                  }}
                >
                  {/* Unread indicator dot */}
                  {!n.read && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--primary)'
                    }}></span>
                  )}

                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: n.read ? '500' : '700',
                    color: 'var(--text-primary)',
                    marginBottom: '0.15rem',
                    paddingRight: '1rem'
                  }}>
                    {n.title}
                  </div>

                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4',
                    marginBottom: '0.25rem'
                  }}>
                    {n.message}
                  </div>

                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)'
                  }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View All Footer */}
          {onViewAll && (
            <div style={{
              padding: '0.65rem 1rem',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.01)'
            }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  width: '100%',
                  display: 'block'
                }}
                id="btn-view-all-notifications"
              >
                View All Notifications
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
