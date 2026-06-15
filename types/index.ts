export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
}

export interface VariantGroup {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  images: string[];
  variantGroups?: VariantGroup[];
  active?: boolean;
  freeShipping?: boolean;
  soldOut?: boolean;
  showPopup?: boolean;
  popupImage?: string;
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
    images?: string[];
  };
  quantity: number;
  selections?: Record<string, string>;
}

export type OrderStatus = 'PEDIDO SIN CONFIRMAR' | 'PAGADO' | 'PEDIDO TOMADO' | 'CANCELADO' | 'ENVIADO' | 'PAGO SIN CONFIRMAR';
export type SalesChannel = 'Whatsapp' | 'Tienda Online' | 'Redes sociales' | 'Otros';

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
  paymentMethod?: string;
  salesChannel?: SalesChannel;
  notes?: string;
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

