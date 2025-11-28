import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/NotificationDropdown.module.css';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    
    // Auto mark all as read when opening notification dropdown
    const autoMarkAllAsRead = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Update unread count in context/header
          if (typeof window !== 'undefined' && window.refreshNotificationCount) {
            window.refreshNotificationCount();
          }
        }
      } catch (error) {
        console.error('Error auto-marking all as read:', error);
      }
    };
    
    autoMarkAllAsRead();

    // Listen for notification updates
    const handleNotificationUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('notificationUpdated', handleNotificationUpdate);

    return () => {
      window.removeEventListener('notificationUpdated', handleNotificationUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications?limit=2', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prevNotifications =>
          prevNotifications.map(notif =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prevNotifications =>
          prevNotifications.map(notif => ({ ...notif, read: true }))
        );
        
        // Update unread count in context/header
        if (typeof window !== 'undefined' && window.refreshNotificationCount) {
          window.refreshNotificationCount();
        }
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId, event) => {
    // Prevent triggering parent onClick
    event.stopPropagation();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove notification from list
        setNotifications(prevNotifications =>
          prevNotifications.filter(notif => notif._id !== notificationId)
        );
        
        // Update unread count in context/header
        if (typeof window !== 'undefined' && window.refreshNotificationCount) {
          window.refreshNotificationCount();
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'streak':
        return '🔥';
      case 'points':
        return '€';
      case 'login':
        return '👋';
      case 'checkin':
        return '✅';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const seconds = Math.floor((now - notifDate) / 1000);

    if (seconds < 60) return t('notifications.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.daysAgo', { count: days });
    return t('notifications.weeksAgo', { count: Math.floor(days / 7) });
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={styles.notificationDropdown} ref={popupRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('notifications.title')}</h3>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllAsRead}>
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      <div className={styles.notificationList}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>{t('notifications.loading')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔔</div>
            <p>{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
              onClick={() => !notification.read && markAsRead(notification._id)}
            >
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className={styles.notificationContent}>
                <p className={styles.notificationMessage}>{notification.message}</p>
                <span className={styles.notificationTime}>
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
              {!notification.read && <div className={styles.unreadDot}></div>}
              <button 
                className={styles.deleteBtn}
                onClick={(e) => deleteNotification(notification._id, e)}
                title={t('notifications.delete') || 'Delete'}
                aria-label="Delete notification"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
