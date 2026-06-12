'use client';

import { useCart } from '@/components/CartProvider';

export default function Header() {
  const { totalItems, openSidebar } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-red-600">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo + nombre — siempre visible */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black tracking-tighter text-black select-none">SD</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm sm:text-base text-black leading-none whitespace-nowrap"
              style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic' }}
            >
              La Tienda Silvestrista
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-red-600 font-semibold hidden sm:block">
              Silvestre Dangond
            </span>
          </div>
        </div>

        {/* Navegación — centrada en desktop, oculta en mobile */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          <a href="#catalogo" className="text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors whitespace-nowrap">
            Colección
          </a>
          <a href="#catalogo" className="text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors whitespace-nowrap">
            Categorías
          </a>
          <a href="#contacto" className="text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors whitespace-nowrap">
            Contacto
          </a>
        </nav>

        {/* Carrito — siempre a la derecha */}
        <button
          onClick={openSidebar}
          className="relative flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:pl-4 sm:pr-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors shrink-0"
          aria-label={`Abrir carrito, ${totalItems} ítems`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <span className="hidden sm:inline">Carrito</span>
          {totalItems > 0 && (
            <span className="bg-white text-red-600 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
