
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { collection, doc, orderBy, query, writeBatch } from 'firebase/firestore';
import type { UserNotification } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { playNotificationSound, showNativeNotification } from '@/lib/notifications';

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  markOrderNotificationsAsRead: (orderId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user } = useFirebase(); // Use core firebase user to avoid circular deps if any
  const lastKnownId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const notificationsRef = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc')) : null,
    [firestore, user]
  );
  
  const { data: notifications, isLoading: loading } = useCollection<UserNotification>(notificationsRef);

  // Sound and Native Alert Trigger
  useEffect(() => {
    if (!notifications || notifications.length === 0) {
        isInitialLoad.current = false;
        return;
    }

    // On first load, just mark the latest ID so we don't alert for old stuff
    if (isInitialLoad.current) {
        lastKnownId.current = notifications[0].id;
        isInitialLoad.current = false;
        return;
    }

    const latest = notifications[0];
    if (latest.id !== lastKnownId.current && !latest.isRead) {
        lastKnownId.current = latest.id;
        
        // Trigger sound and system alert
        playNotificationSound();
        showNativeNotification({
            type: latest.type,
            message: latest.message,
            orderId: latest.orderId
        });
    }
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!user) return;
    const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
    updateDocumentNonBlocking(notificationRef, { isRead: true });
  }, [firestore, user]);

  const markAllAsRead = useCallback(() => {
    if (!user || !notifications) return;
    notifications.forEach(notification => {
        if(!notification.isRead) {
            const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
            updateDocumentNonBlocking(notificationRef, { isRead: true });
        }
    });
  }, [firestore, user, notifications]);

  const markOrderNotificationsAsRead = useCallback(async (orderId: string) => {
    if (!user) return;
    
    const unreadForOrder = notifications?.filter(n => !n.isRead && n.orderId === orderId);
    
    if (unreadForOrder && unreadForOrder.length > 0) {
        const batch = writeBatch(firestore);
        unreadForOrder.forEach(n => {
            const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { isRead: true });
        });
        await batch.commit();
    }
  }, [firestore, user, notifications]);

  const value = useMemo(() => ({
    notifications: notifications || [],
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    markOrderNotificationsAsRead
  }), [notifications, unreadCount, loading, markAsRead, markAllAsRead, markOrderNotificationsAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
