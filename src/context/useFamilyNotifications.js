import { useCallback, useState } from 'react';
import i18n from '../i18n';

/** Owns notification state and optimistic read actions for the current member. */
export function useFamilyNotifications({
  activeMemberId,
  authStatus,
  request,
  showToast,
  versionRef
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const refreshNotifications = useCallback(async ({ silent = false } = {}) => {
    if (authStatus !== 'authenticated' || !activeMemberId) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return [];
    }
    try {
      const data = await request('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadNotificationCount(Number(data.unreadCount || 0));
      return data.notifications || [];
    } catch (error) {
      if (!silent) {
        showToast(
          i18n.t('context:toasts.notificationsUnreachable.title'),
          error.message,
          'warning'
        );
      }
      return [];
    }
  }, [activeMemberId, authStatus, request, showToast]);

  const markNotificationRead = useCallback(async (notificationId, read = true) => {
    const existing = notifications.find(
      notification => notification.id === notificationId
    );
    if (!existing || existing.read === read) return existing || null;
    const optimisticReadAt = read ? Date.now() : null;
    setNotifications(previous => previous.map(notification => (
      notification.id === notificationId
        ? { ...notification, read, readAt: optimisticReadAt }
        : notification
    )));
    setUnreadNotificationCount(previous => Math.max(0, previous + (read ? -1 : 1)));
    try {
      const data = await request(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ read })
      });
      setNotifications(previous => previous.map(notification => (
        notification.id === notificationId ? data.notification : notification
      )));
      setUnreadNotificationCount(Number(data.unreadCount || 0));
      versionRef.current = Number(data.version || versionRef.current);
      return data.notification;
    } catch (error) {
      await refreshNotifications({ silent: true });
      showToast(
        i18n.t('context:toasts.notificationNotSaved.title'),
        error.message,
        'warning'
      );
      return null;
    }
  }, [notifications, refreshNotifications, request, showToast, versionRef]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!unreadNotificationCount) return true;
    const readAt = Date.now();
    setNotifications(previous => previous.map(notification => ({
      ...notification,
      read: true,
      readAt: notification.readAt || readAt
    })));
    setUnreadNotificationCount(0);
    try {
      const data = await request('/api/notifications/read-all', {
        method: 'POST'
      });
      versionRef.current = Number(data.version || versionRef.current);
      return true;
    } catch (error) {
      await refreshNotifications({ silent: true });
      showToast(
        i18n.t('context:toasts.notificationsNotSaved.title'),
        error.message,
        'warning'
      );
      return false;
    }
  }, [refreshNotifications, request, showToast, unreadNotificationCount, versionRef]);

  return {
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    refreshNotifications,
    setNotifications,
    setUnreadNotificationCount,
    unreadNotificationCount
  };
}
