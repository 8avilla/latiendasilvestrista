'use client';

import { useEffect, useState } from 'react';

export default function StickyAddToCart({
  productName,
  price,
  soldOut,
}: {
  productName: string;
  price: number;
  soldOut: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById('add-to-cart-section');
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function scrollToCart() {
    document.getElementById('add-to-cart-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-500 truncate">{productName}</p>
          <p className="text-sm font-bold text-black leading-tight">
            ${price.toLocaleString('es-CO')}
            <span className="text-xs font-normal text-gray-400 ml-1">COP</span>
          </p>
        </div>
        <button
          onClick={scrollToCart}
          disabled={soldOut}
          className={`shrink-0 px-6 py-3 text-xs font-semibold uppercase tracking-widest rounded-xl transition-colors active:scale-[0.97] ${
            soldOut
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-black hover:bg-gray-800 text-white'
          }`}
        >
          {soldOut ? 'Agotado' : '+ Agregar'}
        </button>
      </div>
    </div>
  );
}
