
"use server";

import { addDoc, collection, doc, Firestore, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { UserNotification } from "./types";

type NotificationData = {
    type: string;
    message: string;
    orderId?: string;
}

export async function createNotification(
    firestore: Firestore, 
    userId: string, 
    data: NotificationData
): Promise<void> {
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
}
