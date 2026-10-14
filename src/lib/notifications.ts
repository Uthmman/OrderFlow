
import { collection, Firestore } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { UserNotification } from "./types";
import { serverTimestamp } from "firebase/firestore";

type NotificationData = {
    type: string;
    message: string;
    orderId?: string;
}

/**
 * Plays a notification sound.
 * Note: Browsers usually require a user interaction on the page first.
 */
export const playNotificationSound = () => {
    if (typeof window !== 'undefined') {
        try {
            const audio = new Audio("https://ensratech.com/api/notification.mp3");
            audio.volume = 0.7;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Sound playback blocked by browser. User interaction required.", error);
                });
            }
        } catch (err) {
            console.error("Audio playback error:", err);
        }
    }
};

/**
 * Shows a native system notification.
 * Updated to use ServiceWorker registration which is more reliable on Android.
 */
export const showNativeNotification = async (data: { type: string; message: string; orderId?: string }) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const title = `OrderFlow: ${data.type}`;
        const options: NotificationOptions = {
            body: data.message,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: data.orderId || 'general',
            renotify: true,
            silent: false,
            vibrate: [200, 100, 200],
            data: {
                orderId: data.orderId,
                url: data.orderId ? `/orders/${data.orderId}?tab=chat` : '/'
            },
            timestamp: Date.now()
        };

        // On Android PWA, using the ServiceWorker registration is much more reliable
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, options);
                return;
            } catch (err) {
                console.warn("ServiceWorker notification failed, falling back to standard Notification", err);
            }
        }

        // Fallback for standard web/legacy
        const notification = new Notification(title, options);
        notification.onclick = (e) => {
            e.preventDefault();
            window.focus();
            if (data.orderId) {
                window.location.href = `/orders/${data.orderId}?tab=chat`;
            }
            notification.close();
        };
    }
};

/**
 * Sender-side function to distribute notifications to recipients in Firestore.
 */
export function triggerNotification(
    firestore: Firestore, 
    userIds: string[], 
    data: NotificationData
): void {
     if (!userIds || userIds.length === 0) {
        return;
    }

    userIds.forEach(userId => {
        const notificationsRef = collection(firestore, 'users', userId, 'notifications');
        const newNotification: Omit<UserNotification, 'id'> = {
            userId,
            type: data.type,
            message: data.message,
            orderId: data.orderId,
            timestamp: serverTimestamp(),
            isRead: false,
        };
        
        addDocumentNonBlocking(notificationsRef, newNotification);
    });
}

/**
 * Requests permission from the user to show native system notifications.
 */
export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    if (Notification.permission === 'denied') {
        return false;
    }

    if (Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (err) {
            return false;
        }
    }
    
    return Notification.permission === 'granted';
}
