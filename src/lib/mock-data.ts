
import { User, Customer, Order } from './types';

export const MOCK_USERS: Record<string, User> = {
  Admin: {
    id: 'admin-user-id',
    name: 'Admin User',
    email: 'zenbabafurniture@gmail.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=admin',
    role: 'Admin',
    verified: true,
  },
  Manager: {
    id: 'manager-user-id',
    name: 'Manager User',
    email: 'manager@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=manager',
    role: 'Manager',
    verified: true,
  },
  Sales: {
    id: 'sales-user-id',
    name: 'Sales User',
    email: 'sales@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=sales',
    role: 'Sales',
    verified: true,
  },
  Designer: {
    id: 'designer-user-id',
    name: 'Designer User',
    email: 'designer@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=designer',
    role: 'Designer',
    verified: true,
  },
};

export const MOCK_USERS_LIST = Object.values(MOCK_USERS);

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Innovate Inc.',
    email: 'contact@innovateinc.com',
    phone: '555-0101',
    company: 'Innovate Inc.',
    avatarUrl: 'https://i.pravatar.cc/150?u=innovate',
    orderIds: ['order-1', 'order-3'],
    ownerId: 'sales-user-id',
  },
  {
    id: 'cust-2',
    name: 'Solutions Co.',
    email: 'support@solutionsco.com',
    phone: '555-0102',
    company: 'Solutions Co.',
    avatarUrl: 'https://i.pravatar.cc/150?u=solutions',
    orderIds: ['order-2'],
    ownerId: 'sales-user-id',
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    customerName: 'Innovate Inc.',
    customerId: 'cust-1',
    description: 'Custom ergonomic office chairs for the new headquarters. Upholstered in premium grey fabric with adjustable lumbar support.',
    status: 'In Progress',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    incomeAmount: 15000,
    prepaidAmount: 7500,
    isUrgent: true,
    creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      { fileName: 'chair-design-spec.pdf', url: '#', storagePath: 'mock/path/1' },
      { fileName: 'fabric-sample.jpg', url: 'https://picsum.photos/seed/fabric/200/150', storagePath: 'mock/path/2' },
    ],
    colors: ['Charcoal Gray'],
    material: 'Aluminum, Premium Fabric',
    dimensions: { width: 60, height: 110, depth: 65 },
    paymentDetails: '50% upfront via wire transfer.',
    assignedTo: ['designer-user-id', 'manager-user-id'],
    ownerId: 'sales-user-id',
    chatMessages: [
        { user: { id: 'sales-user-id', name: 'Sales User', avatarUrl: MOCK_USERS['Sales'].avatarUrl }, text: 'New order created.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { user: { id: 'designer-user-id', name: 'Designer User', avatarUrl: MOCK_USERS['Designer'].avatarUrl }, text: "I've started on the 3D models.", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: 'order-2',
    customerName: 'Solutions Co.',
    customerId: 'cust-2',
    description: 'A set of 10 bespoke walnut conference tables. Rectangular shape with embedded power outlets.',
    status: 'Designing',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    incomeAmount: 25000,
    prepaidAmount: 10000,
    isUrgent: false,
    creationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    colors: ['Black Walnut'],
    material: 'Solid Walnut Wood',
    dimensions: { width: 240, height: 75, depth: 120 },
    paymentDetails: '40% upfront.',
    assignedTo: ['designer-user-id'],
    ownerId: 'sales-user-id',
    chatMessages: [
       { user: { id: 'sales-user-id', name: 'Sales User', avatarUrl: MOCK_USERS['Sales'].avatarUrl }, text: 'Order confirmed by client.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  },
];
