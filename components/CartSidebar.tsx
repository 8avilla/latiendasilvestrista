'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, buildSelectionsKey } from '@/components/CartProvider';
import Image from 'next/image';


function formatSelections(selections?: Record<string, string>): string {
  if (!selections || Object.keys(selections).length === 0) return '';
  return Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', ');
}

export default function CartSidebar() {
  const { items, isOpen, closeSidebar, removeItem, updateQty, clearCart, totalItems, totalPrice } =
    useCart();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSidebar();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeSidebar]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);


  function handleGoToCart() {
    closeSidebar();
    router.push('/carrito');
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col border-l-4 border-black transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg text-black italic font-semibold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
              Tu carrito
            </h2>
            {totalItems > 0 && (
              <p className="text-[11px] uppercase tracking-widest text-gray-400 mt-0.5">
                {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
              </p>
            )}
          </div>
          <button onClick={closeSidebar} className="text-gray-400 hover:text-black transition-colors p-1" aria-label="Cerrar carrito">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-xs uppercase tracking-widest text-gray-400">Carrito vacío</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {items.map(item => {
                const itemKey = `${item.product.id}-${buildSelectionsKey(item.selections)}`;
                const selText = formatSelections(item.selections);
                return (
                  <li key={itemKey} className="py-4 flex gap-4 items-center">
                    {/* Imagen del Producto */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      {item.product.images && item.product.images[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">
                          Sin foto
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">
                        {item.product.category}
                      </p>
                      <p className="text-sm font-medium text-black leading-snug truncate">
                        {item.product.name}
                      </p>
                      {selText && (
                        <p className="text-xs text-gray-400 mt-0.5">{selText}</p>
                      )}
                      <p className="text-sm text-black font-semibold mt-1" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                        ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center border border-gray-200">
                        <button
                          onClick={() => updateQty(item.product.id, buildSelectionsKey(item.selections), item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                          aria-label="Reducir"
                        >−</button>
                        <span className="w-6 text-center text-xs font-medium text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product.id, buildSelectionsKey(item.selections), item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                          aria-label="Aumentar"
                        >+</button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, buildSelectionsKey(item.selections))}
                        className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                        aria-label="Eliminar"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 flex flex-col gap-3">
            {/* Subtotal */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-gray-400">Subtotal</span>
              <span className="text-sm font-semibold text-black">
                ${totalPrice.toLocaleString('es-CO')}
              </span>
            </div>

            {/* Envío estimado */}
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest text-gray-400">Envío</span>
              <span className="text-xs font-semibold text-black">$20.000</span>
            </div>

            {/* Total estimado */}
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
              <span className="text-xs uppercase tracking-widest text-gray-400">Total</span>
              <span className="text-2xl text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                ${(totalPrice + 20000).toLocaleString('es-CO')}
                <span className="text-xs text-gray-400 font-sans ml-1">est.</span>
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleGoToCart}
                className="w-full bg-black hover:bg-neutral-900 text-white py-4 flex items-center justify-center gap-3 transition-colors active:scale-[0.99] text-sm font-medium uppercase tracking-[0.1em]"
              >
                Pagar con Tarjeta / PSE
              </button>
            </div>

            <button
              onClick={clearCart}
              className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-black transition-colors text-center mt-1"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
