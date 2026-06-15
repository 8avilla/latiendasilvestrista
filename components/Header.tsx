'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/CartProvider';

const NAV_LINKS = [
  { label: 'Colección', href: '#catalogo' },
  { label: 'Tallas',    href: '#tallas' },
  { label: 'Preguntas', href: '#faq' },
  { label: 'Contacto',  href: '#contacto' },
];

export default function Header() {
  const { totalItems, openSidebar } = useCart();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-150' 
        : 'bg-white border-b-2 border-red-600'
    }`}>
      <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
        scrolled ? 'h-14' : 'h-16'
      }`}>

        {/* Logo */}
        <Link
          href="/"
          onClick={e => { if (isHome) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
          className="flex items-center gap-2.5 shrink-0 group/logo cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center shrink-0 group-hover/logo:rotate-[15deg] group-hover/logo:border-red-600 transition-all duration-300">
            <span className="text-[11px] font-black tracking-tighter text-black group-hover/logo:text-red-600 transition-colors">SD</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm sm:text-base text-black leading-none whitespace-nowrap group-hover/logo:text-red-600 transition-colors duration-300"
              style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic' }}
            >
              La Tienda Silvestrista
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-red-600 font-semibold hidden sm:block">
              Silvestre Dangond
            </span>
          </div>
        </Link>

        {/* Nav — desktop */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={isHome ? link.href : `/${link.href}`}
              className="relative text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors whitespace-nowrap py-1 group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </a>
          ))}
          <Link
            href="/seguimiento"
            className="relative text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors whitespace-nowrap py-1 group"
          >
            Mi pedido
            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </Link>
        </nav>

        {/* Derecha: hamburger (móvil) + carrito */}
        <div className="flex items-center gap-3">

          {/* Hamburger — solo móvil/tablet */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="lg:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 shrink-0"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span className={`block h-px w-5 bg-black transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
            <span className={`block h-px w-5 bg-black transition-all duration-150 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block h-px w-5 bg-black transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
          </button>

          {/* Carrito */}
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
      </div>

      {/* Menú móvil desplegable */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-100 ${
          menuOpen ? 'max-h-64' : 'max-h-0'
        }`}
      >
        <nav className="px-4 sm:px-6 py-3 flex flex-col">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={isHome ? link.href : `/${link.href}`}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors border-b border-gray-50 last:border-0"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/seguimiento"
            onClick={() => setMenuOpen(false)}
            className="py-3 text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
          >
            Mi pedido
          </Link>
        </nav>
      </div>
    </header>
  );
}
