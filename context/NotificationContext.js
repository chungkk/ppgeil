import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      // Expose refresh function globally
      if (typeof window !== 'undefined') {
        window.refreshNotificationCount = fetchUnreadCount;
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.refreshNotificationCount = null;
      }
    };
  }, [user, fetchUnreadCount]);

  // Listen for notification update events
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (user) {
        fetchUnreadCount();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('notificationUpdated', handleNotificationUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('notificationUpdated', handleNotificationUpdate);
      }
    };
  }, [user, fetchUnreadCount]);

  const value = {
    unreadCount,
    fetchUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export default NotificationContext;
