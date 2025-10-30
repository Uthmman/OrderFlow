
"use server";

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
        // Use a simple data URI for a beep sound to avoid needing an external file
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'//'//");
        audio.play().catch(e => console.error("Error playing sound:", e));
    }
};

export function triggerNotification(
    firestore: Firestore, 
    userId: string, 
    data: NotificationData
): void {
     if (!userId) {
        console.error("Cannot create notification without a userId.");
        return;
    }

    const notificationsRef = collection(firestore, 'users', userId, 'notifications');
    const newNotification: Omit<UserNotification, 'id'> = {
        userId,
        type: data.type,
        message: data.message,
        orderId: data.orderId,
        timestamp: serverTimestamp(),
        isRead: false,
    };
    
    // We use a non-blocking write so it doesn't slow down the main operation
    addDocumentNonBlocking(notificationsRef, newNotification);

    // Show a toast notification
    toast({
        title: data.type,
        description: data.message,
    });
    
    // Play sound
    playNotificationSound();
}
