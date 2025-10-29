export interface Tenant {
  id: string;
  nama: string;
  slug: string;
  logoUrl: string;
  qrisImageUrl: string;
  tokenHarian: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin_kafe';
  tenantId?: string;
  tenantName?: string; // For display purposes
}

export interface SuperAdminRole {
    userId: string;
    email: string;
    role: 'superadmin';
    assignedAt: any; // Firestore ServerTimestamp
}


export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuItemVariant {
  name: string;
  additionalPrice: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  variants: MenuItemVariant[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  variant?: MenuItemVariant;
}

export type OrderStatus = 'Received' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Paid';
export type PaymentMethod = 'Cash' | 'QRIS';

export interface Order {
  id: string;
  tableNumber: number;
  items: {
    menuId: string;
    name: string;
    quantity: number;
    price: number;
    variant?: {
      name: string;
      additionalPrice: number;
    }
  }[];
  totalAmount: number;
  uniqueAmount?: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  verificationToken?: string;
}

export interface Table {
  id: string;
  number: number;
  status: 'Empty' | 'Occupied';
}
