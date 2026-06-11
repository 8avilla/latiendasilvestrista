'use client';

import { useCart } from '@/components/CartProvider';

export default function Header() {
  const { totalItems, openSidebar } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-red-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-baseline gap-2">
          <span
            className="text-xl text-black leading-none"
            style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic' }}
          >
            La Tienda Silvestrista
          </span>
          <span className="text-red-600 text-base leading-none select-none">·</span>
          <span className="text-xs text-red-600 font-semibold tracking-wide hidden sm:inline">
            Silvestre Dangond
          </span>
        </div>

        {/* Cart button */}
        <button
          onClick={openSidebar}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-sm text-black hover:bg-gray-50 transition-colors group"
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
              strokeWidth={1.5}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <span className="text-sm font-medium hidden sm:block">Carrito</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
