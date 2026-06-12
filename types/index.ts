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
}

export interface CartItem {
  product: Product;
  quantity: number;
  selections?: Record<string, string>;
}
