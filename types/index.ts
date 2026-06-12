export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  images: string[];
  variants?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}
