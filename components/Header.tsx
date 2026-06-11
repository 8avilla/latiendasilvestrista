'use client';

import { useCart } from '@/components/CartProvider';

export default function Header() {
  const { totalItems, openSidebar } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-red-600 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white text-lg tracking-tight">
            La Tienda Silvestrista
          </span>
          <span className="text-xs text-red-100 font-medium hidden sm:block">
            Productos oficiales del movimiento silvestrista
          </span>
        </div>

        {/* Cart button */}
        <button
          onClick={openSidebar}
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl border border-white/30 text-white hover:bg-white/15 transition-colors group"
          aria-label={`Abrir carrito, ${totalItems} ítems`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <span className="text-sm font-medium hidden sm:block">Carrito</span>
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white text-xs font-bold rounded-full flex items-center justify-center">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
