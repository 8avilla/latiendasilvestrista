'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; selections?: Record<string, string> }
  | { type: 'REMOVE_ITEM'; productId: string; selectionsKey: string }
  | { type: 'UPDATE_QTY'; productId: string; selectionsKey: string; quantity: number }
  | { type: 'LOAD_ITEMS'; items: CartItem[] }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_SIDEBAR' }
  | { type: 'CLOSE_SIDEBAR' };

interface CartContextValue extends CartState {
  addItem: (product: Product, selections?: Record<string, string>) => void;
  removeItem: (productId: string, selectionsKey: string) => void;
  updateQty: (productId: string, selectionsKey: string, quantity: number) => void;
  clearCart: () => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'verzus-cart';

export function buildSelectionsKey(selections?: Record<string, string>): string {
  if (!selections || Object.keys(selections).length === 0) return '';
  return Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOAD_ITEMS':
      return { ...state, items: action.items };

    case 'ADD_ITEM': {
      const key = buildSelectionsKey(action.selections);
      const existing = state.items.find(
        i => i.product.id === action.product.id && buildSelectionsKey(i.selections) === key
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.product.id === action.product.id && buildSelectionsKey(i.selections) === key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: 1, selections: action.selections }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(
          i => !(i.product.id === action.productId && buildSelectionsKey(i.selections) === action.selectionsKey)
        ),
      };

    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            i => !(i.product.id === action.productId && buildSelectionsKey(i.selections) === action.selectionsKey)
          ),
        };
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.product.id === action.productId && buildSelectionsKey(i.selections) === action.selectionsKey
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'LOAD_ITEMS', items: JSON.parse(stored) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch { /* ignore */ }
  }, [state.items]);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const value: CartContextValue = {
    ...state,
    addItem: (product, selections) => dispatch({ type: 'ADD_ITEM', product, selections }),
    removeItem: (productId, selectionsKey) => dispatch({ type: 'REMOVE_ITEM', productId, selectionsKey }),
    updateQty: (productId, selectionsKey, quantity) =>
      dispatch({ type: 'UPDATE_QTY', productId, selectionsKey, quantity }),
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
