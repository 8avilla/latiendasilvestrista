export type Category = 'todos' | 'camisetas' | 'sombreros' | 'gorras' | 'manillas' | 'vasos';

export interface Product {
  id: string;
  name: string;
  category: Exclude<Category, 'todos'>;
  price: number;
  description: string;
  image: string;
  variants?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}
