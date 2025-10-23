import { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Manager' | 'Sales' | 'Designer';

export type User = {
  id: string; // This is the uid from Firebase Auth
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
  customClaims?: { [key: string]: any };
};

export type FirebaseUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    customClaims?: { [key: string]: any };
}

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatarUrl: string;
  orderIds: string[];
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

export type Order = {
  id: string;
  customerName: string;
  customerId: string;
  description: string;
  status: OrderStatus;
  deadline: string; // ISO string
  incomeAmount: number;
  prepaidAmount?: number;
  isUrgent: boolean;
  creationDate: string; // ISO string
  attachments?: { type: 'image' | 'voice'; url: string; fileName: string }[];
  colors?: string[];
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  paymentDetails: string;
  assignedTo: string[];
  ownerId: string;
};
