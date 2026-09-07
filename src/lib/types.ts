
import { Timestamp } from "firebase/firestore";

export type Role = 'Admin' | 'Manager' | 'Sales' | 'Designer' | 'Pending';

export type OrderSortPreference = {
  field: 'creationDate' | 'deadline';
  direction: 'asc' | 'desc';
};

export type AppUser = {
  id: string; 
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
  phoneNumber?: string;
  telegram?: string;
  orderSortPreference?: OrderSortPreference;
  dashboardOrderSortPreference?: OrderSortPreference;
  workerType?: 'Monthly' | 'Daily';
};

export type CustomerReview = {
  id: string;
  orderId: string;
  rating: number;
  comment: string;
  date: string; 
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
  | 'Painting'
  | 'Completed'
  | 'Shipped'
  | 'Cancelled';

export type OrderAttachment = {
  fileName: string;
  url: string;
  storagePath: string;
};

export type OrderChatMessage = {
    id: string; 
    user: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    text: string;
    attachment?: OrderAttachment;
    timestamp: any; 
    isSystemMessage?: boolean;
}

export type UserNotification = {
    id: string;
    userId: string;
    type: string;
    message: string;
    timestamp: any; 
    isRead: boolean;
    orderId?: string;
}

export type Product = {
  id: string;
  productName: string;
  category: string;
  description: string;
  attachments?: OrderAttachment[];
  designAttachments?: OrderAttachment[]; 
  colors?: string[];
  material?: string[];
  dimensions?: { width: number; height: number; depth: number };
  price: number;
  orderIds?: string[];
  billOfMaterials?: string;
  isStandard?: boolean; 
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Balance Due' | 'Unpaid';

export type Order = {
  id:string;
  uniqueName?: string;
  mainImageUrl?: string; 
  customerName: string;
  customerId: string;
  products: Product[];
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  location: { town: string; };
  deadline: Timestamp | Date | string;
  incomeAmount: number;
  prepaidAmount?: number;
  isUrgent: boolean;
  creationDate: Timestamp | Date | string;
  paymentDetails?: string;
  assignedTo: string[];
  ownerId: string;
  chatMessages?: OrderChatMessage[];
  
  withReceipt?: boolean;
  vatAmount?: number;
  totalWithVat?: number;
  paymentMethod?: string;
  bankName?: string;
  bankAccountNumber?: string;
  receiptAttachment?: OrderAttachment;
  batchReceiptId?: string;
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

export type ProductCategory = {
    name: string;
    icon: string;
}

export type Material = {
    name: string;
    icon: string;
}

export type ProductSettings = {
    productCategories: ProductCategory[];
    materials: Material[];
}

export type BankAccount = {
    bankName: string;
    accountNumber: string;
    id: string;
}

export type PaymentSettings = {
    methods: string[];
    banks: BankAccount[];
}

export type StockUnit = 'pcs' | 'kg' | 'liter' | 'meters' | 'set' | 'box' | 'sheets' | 'liters' | 'grams';

export type StockTransactionType = 'In' | 'Out';

export type StockTransaction = {
  id: string;
  itemId: string;
  type: StockTransactionType;
  quantity: number;
  reason: string;
  orderId?: string;
  timestamp: any;
  userId: string;
  userName: string;
};

export type StockItem = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  icon?: string;
  currentQuantity: number;
  unit: StockUnit;
  minQuantity?: number;
  lastUpdated: any;
};

export type StockSettings = {
  categories: string[];
};
