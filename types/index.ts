export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
}

export interface VariantGroup {
  name: string;
  options: string[];
  imageMap?: Record<string, number>; // option value → image index
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  purchaseCost?: number;
  description: string;
  images: string[];
  variantGroups?: VariantGroup[];
  active?: boolean;
  freeShipping?: boolean;
  soldOut?: boolean;
  showPopup?: boolean;
  popupImage?: string;
  stock?: number | null;
  stockTracked?: boolean;
  lastUnits?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selections?: Record<string, string>;
}

export interface OrderItem {
  product: {
    id: string;
    name: string;
    category: string;
    price: number;
    purchaseCost?: number;
    images?: string[];
  };
  quantity: number;
  selections?: Record<string, string>;
}

export type OrderStatus = 'NUEVO PEDIDO' | 'PAGO PENDIENTE' | 'CONFIRMADO' | 'EN PREPARACIÓN' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
export type SalesChannel = 'Whatsapp' | 'Tienda Online' | 'Redes sociales' | 'Otros';
export type PaymentMethod = 'Bold' | 'Efectivo' | 'Nequi' | 'Bancolombia' | 'Daviplata' | 'Otros';

export interface Order {
  _id: string;
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  shippingPrice?: number;
  shippingDetails: {
    name: string;
    address: string;
    department: string;
    city: string;
    phone: string;
    email: string;
  };
  status: OrderStatus;
  paymentMethod?: PaymentMethod | string;
  salesChannel?: SalesChannel;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  deleted?: boolean;
  createdAt: string; // Serialized date
  updatedAt: string; // Serialized date
  transactionDetails?: {
    paymentId: string;
    subject: string;
    time: string;
    payloadType: string;
  };
}

export interface AdminUser {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}


