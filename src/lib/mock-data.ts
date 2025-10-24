
import { User, Customer, Order, CustomerReview } from './types';

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

const mockReviews: CustomerReview[] = [
    {
      id: 'review-1',
      orderId: 'order-1',
      rating: 5,
      comment: 'The chairs are fantastic! Excellent quality and delivered on time.',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
     {
      id: 'review-2',
      orderId: 'order-3',
      rating: 4,
      comment: 'Good work on the reception desk. There was a slight delay but the quality is top-notch.',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Innovate Inc.',
    email: 'contact@innovateinc.com',
    phoneNumbers: [
      { type: 'Work', number: '555-0101' },
      { type: 'Mobile', number: '555-0199' },
    ],
    telegram: '@innovate_contact',
    company: 'Innovate Inc.',
    avatarUrl: 'https://i.pravatar.cc/150?u=innovate',
    gender: 'Other',
    location: {
      town: 'Tech City, CA',
      mapUrl: 'https://maps.app.goo.gl/BWK4KUwXzuBfNSpk7',
    },
    orderIds: ['order-1', 'order-3'],
    reviews: mockReviews,
    ownerId: 'sales-user-id',
  },
  {
    id: 'cust-2',
    name: 'Samantha Solutions',
    email: 'samantha@solutionsco.com',
    phoneNumbers: [{ type: 'Mobile', number: '555-0102' }],
    company: 'Solutions Co.',
    avatarUrl: 'https://i.pravatar.cc/150?u=solutions',
    gender: 'Female',
    location: {
        town: 'Metropolis, NY',
        mapUrl: 'https://maps.app.goo.gl/BWK4KUwXzuBfNSpk7',
    },
    orderIds: ['order-2'],
    reviews: [],
    ownerId: 'sales-user-id',
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    customerName: 'Innovate Inc.',
    customerId: 'cust-1',
    description: 'Custom ergonomic office chairs for the new headquarters. Upholstered in premium grey fabric with adjustable lumbar support.',
    status: 'Completed',
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    incomeAmount: 15000,
    prepaidAmount: 7500,
    isUrgent: true,
    creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      { fileName: 'chair-design-spec.pdf', url: 'https://picsum.photos/seed/attachment1/200/150', storagePath: 'mock/path/1' },
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
    customerName: 'Samantha Solutions',
    customerId: 'cust-2',
    description: 'A set of 10 bespoke walnut conference tables. Rectangular shape with embedded power outlets.',
    status: 'Designing',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    incomeAmount: 25000,
    prepaidAmount: 10000,
    isUrgent: false,
    creationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
        {
            fileName: "voice-memo-1.webm",
            url: "https://firebasestorage.googleapis.com/v0/b/course-registration-cce07.appspot.com/o/seed%2FAudio-1.mp3?alt=media&token=85483961-a477-44a3-832f-b472f153a553",
            storagePath: "seed/Audio-1.mp3"
        }
    ],
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
  {
    id: 'order-3',
    customerName: 'Innovate Inc.',
    customerId: 'cust-1',
    description: 'Custom reception desk with integrated lighting.',
    status: 'Completed',
    deadline: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    incomeAmount: 8500,
    prepaidAmount: 8500,
    isUrgent: false,
    creationDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    colors: ['Glossy White'],
    material: 'MDF, LED lighting',
    dimensions: { width: 300, height: 100, depth: 80 },
    paymentDetails: '100% upfront.',
    assignedTo: ['designer-user-id', 'manager-user-id'],
    ownerId: 'sales-user-id',
    chatMessages: []
  }
];
