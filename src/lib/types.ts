export type Role = 'Admin' | 'Manager' | 'Sales' | 'Designer';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatarUrl: string;
  orderIds: string[];
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
  deadline: string;
  incomeAmount: number;
  isUrgent: boolean;
  creationDate: string;
  attachments?: { type: 'image' | 'voice'; url: string; fileName: string }[];
  color?: string;
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  paymentDetails: string;
  assignedTo: string[];
};
