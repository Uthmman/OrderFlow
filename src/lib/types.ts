

import { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Manager' | 'Sales' | 'Designer';

export type User = {
  id: string; // This is the uid from Firebase Auth
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
  verified: boolean;
  customClaims?: { [key: string]: any };
};

export type FirebaseUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    customClaims?: { [key:string]: any };
    role?: Role;
    verified?: boolean;
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
    mapCoordinates: { lat: number; lng: number };
  };
  orderIds: string[];
  reviews: CustomerReview[];
  ownerId: string;
};


export type OrderStatus =
  | 'Pending'
  | 'In Progress'
  | 'Designing'
  | 'Manufacturing'
  | 'Completed'
  | 'Shipped'
  | 'Cancelled';

export type OrderChatMessage = {
    user: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    timestamp: string; // ISO String
    isSystemMessage?: boolean;
}

export type OrderAttachment = {
  fileName: string;
  url: string;
  storagePath: string;
};


export type Order = {
  id:string;
  customerName: string;
  customerId: string;
  description: string;
  status: OrderStatus;
  deadline: string; // ISO string
  incomeAmount: number;
  prepaidAmount?: number;
  isUrgent: boolean;
  creationDate: any; // Can be string or Firestore Timestamp
  attachments?: OrderAttachment[];
  colors?: string[];
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  paymentDetails: string;
  assignedTo: string[];
  ownerId: string;
  chatMessages?: OrderChatMessage[];
};
