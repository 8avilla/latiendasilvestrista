'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; variant?: string }
  | { type: 'REMOVE_ITEM'; productId: string; variant?: string }
  | { type: 'UPDATE_QTY'; productId: string; variant: string | undefined; quantity: number }
  | { type: 'LOAD_ITEMS'; items: CartItem[] }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_SIDEBAR' }
  | { type: 'CLOSE_SIDEBAR' };

interface CartContextValue extends CartState {
  addItem: (product: Product, variant?: string) => void;
  removeItem: (productId: string, variant?: string) => void;
  updateQty: (productId: string, variant: string | undefined, quantity: number) => void;
  clearCart: () => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'silvestrista-cart';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOAD_ITEMS':
      return { ...state, items: action.items };
    case 'ADD_ITEM': {
      const key = action.variant ?? '';
      const existing = state.items.find(
        (i) => i.product.id === action.product.id && (i.variant ?? '') === key
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id && (i.variant ?? '') === key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: 1, variant: action.variant }],
      };
    }
    case 'REMOVE_ITEM': {
      const key = action.variant ?? '';
      return {
        ...state,
        items: state.items.filter(
          (i) => !(i.product.id === action.productId && (i.variant ?? '') === key)
        ),
      };
    }
    case 'UPDATE_QTY': {
      const key = action.variant ?? '';
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => !(i.product.id === action.productId && (i.variant ?? '') === key)
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId && (i.variant ?? '') === key
            ? { ...i, quantity: action.quantity }
            : i
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN_SIDEBAR':
      return { ...state, isOpen: true };
    case 'CLOSE_SIDEBAR':
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: CartItem[] = JSON.parse(stored);
        dispatch({ type: 'LOAD_ITEMS', items });
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore quota errors
    }
  }, [state.items]);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const value: CartContextValue = {
    ...state,
    addItem: (product, variant) => dispatch({ type: 'ADD_ITEM', product, variant }),
    removeItem: (productId, variant) => dispatch({ type: 'REMOVE_ITEM', productId, variant }),
    updateQty: (productId, variant, quantity) =>
      dispatch({ type: 'UPDATE_QTY', productId, variant, quantity }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    openSidebar: () => dispatch({ type: 'OPEN_SIDEBAR' }),
    closeSidebar: () => dispatch({ type: 'CLOSE_SIDEBAR' }),
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
