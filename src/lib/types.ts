

import { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Manager' | 'Sales' | 'Designer' | 'Pending';

export type AppUser = {
  id: string; // This is the uid from Firebase Auth
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
};

export type FirebaseUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export type CustomerReview = {
  id: string;
  orderId: string;
  rating: number;
  comment: string;
  date: string; // ISO string
}

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phoneNumbers: { type: 'Mobile' | 'Work' | 'Home' | 'Secondary'; number: string }[];
  telegram?: string;
  company?: string;
  avatarUrl: string;
  gender: 'Male' | 'Female' | 'Other';
  location: {
    town: string;
    mapUrl?: string;
  };
  notes?: string;
  orderIds: string[];
  reviews: CustomerReview[];
  ownerId: string;
};


export type OrderStatus =
  | 'Pending'
  | 'In Progress'
  | 'Designing'
  | 'Design Ready'
  | 'Manufacturing'
  | 'Completed'
  | 'Shipped'
  | 'Cancelled';

export type OrderAttachment = {
  fileName: string;
  url: string;
  storagePath: string;
};

export type OrderChatMessage = {
    id: string; // Unique ID for the message itself
    user: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    text: string;
    attachment?: OrderAttachment;
    timestamp: any; // Can be string or Firestore Timestamp
    isSystemMessage?: boolean;
}

export type UserNotification = {
    id: string;
    userId: string;
    type: string;
    message: string;
    timestamp: any; // Can be string or Firestore Timestamp
    isRead: boolean;
    orderId?: string;
}

export type Order = {
  id:string;
  customerName: string;
  customerId: string;
  description: string;
  status: OrderStatus;
  deadline: any; // Can be string or Firestore Timestamp
  incomeAmount: number;
  prepaidAmount?: number;
  isUrgent: boolean;
  creationDate: any; // Can be string or Firestore Timestamp
  attachments?: OrderAttachment[];
  colors?: string[];
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  paymentDetails?: string;
  assignedTo: string[];
  ownerId: string;
  chatMessages?: OrderChatMessage[];
};

export type WoodFinish = {
    name: string;
    imageUrl: string;
}

export type CustomColor = {
    name: string;
    colorValue: string;
}

export type ColorSettings = {
    woodFinishes: WoodFinish[];
    customColors: CustomColor[];
}

    
