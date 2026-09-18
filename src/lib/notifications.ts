
import { addDoc, collection, doc, Firestore, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { UserNotification } from "./types";
import { toast } from "@/hooks/use-toast";

type NotificationData = {
    type: string;
    message: string;
    orderId?: string;
}

// Function to play a notification sound
const playNotificationSound = () => {
    if (typeof window !== 'undefined') {
        const audio = new Audio("https://ensratech.com/api/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => {
            console.warn("Notification sound blocked by browser policy until interaction.");
        });
    }
};

/**
 * Shows a native system notification if the browser supports it and permission is granted.
 */
const showNativeNotification = (data: NotificationData) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const notification = new Notification(`OrderFlow: ${data.type}`, {
            body: data.message,
            icon: 'https://picsum.photos/seed/orderflow/192/192',
            badge: 'https://picsum.photos/seed/orderflow/96/96',
            tag: data.orderId || 'general',
            renotify: true,
        });

        notification.onclick = () => {
            window.focus();
            if (data.orderId) {
                window.location.href = `/orders/${data.orderId}?tab=chat`;
            }
            notification.close();
        };
    }
};

export function triggerNotification(
    firestore: Firestore, 
    userIds: string[], 
    data: NotificationData
): void {
     if (!userIds || userIds.length === 0) {
        return;
    }

    // Create a notification for each user in Firestore
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

    // Show a native browser notification
    showNativeNotification(data);

    // Play sound to grab user attention
    playNotificationSound();
}

/**
 * Requests permission from the user to show native system notifications.
 */
export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    if (Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (err) {
            console.error("Error requesting notification permission:", err);
            return false;
        }
    }
    
    return Notification.permission === 'granted';
}
