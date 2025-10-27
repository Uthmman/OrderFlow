
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import type { UserNotification } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser } from './use-user';

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const notificationsRef = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.id, 'notifications'), orderBy('timestamp', 'desc')) : null,
    [firestore, user]
  );
  
  const { data: notifications, isLoading: loading } = useCollection<UserNotification>(notificationsRef);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!user) return;
    const notificationRef = doc(firestore, 'users', user.id, 'notifications', notificationId);
    updateDocumentNonBlocking(notificationRef, { isRead: true });
  }, [firestore, user]);

  const markAllAsRead = useCallback(() => {
    if (!user || !notifications) return;
    notifications.forEach(notification => {
        if(!notification.isRead) {
            const notificationRef = doc(firestore, 'users', user.id, 'notifications', notification.id);
            updateDocumentNonBlocking(notificationRef, { isRead: true });
        }
    });
  }, [firestore, user, notifications]);

  const value = useMemo(() => ({
    notifications: notifications || [],
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  }), [notifications, unreadCount, loading, markAsRead, markAllAsRead]);

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
