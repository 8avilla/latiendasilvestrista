'use client';

import { useEffect } from 'react';
import { useCart, buildSelectionsKey } from '@/components/CartProvider';
import { CartItem } from '@/types';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573004340482';

function formatSelections(selections?: Record<string, string>): string {
  if (!selections || Object.keys(selections).length === 0) return '';
  return Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function buildWhatsAppURL(items: CartItem[], total: number): string {
  const lines = items.map(item => {
    const sel = formatSelections(item.selections);
    const subtotal = item.product.price * item.quantity;
    return `• ${item.quantity}x ${item.product.name}${sel ? ` — ${sel}` : ''} — $${subtotal.toLocaleString('es-CO')}`;
  });
  const text = [
    '*Pedido — La Tienda Silvestrista*',
    '_Silvestre Dangond_',
    '',
    ...lines,
    '',
    `*Total: $${total.toLocaleString('es-CO')}*`,
    '',
    '_Enviado desde la tienda online_',
  ].join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function CartSidebar() {
  const { items, isOpen, closeSidebar, removeItem, updateQty, clearCart, totalItems, totalPrice } =
    useCart();

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

  function handleCheckout() {
    const url = buildWhatsAppURL(items, totalPrice);
    window.open(url, '_blank', 'noopener,noreferrer');
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
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col border-l-4 border-red-600 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg text-black italic" style={{ fontFamily: 'var(--font-dm-serif)' }}>
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
                  <li key={itemKey} className="py-4 flex gap-4 items-start">
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
                      <p className="text-sm text-red-600 font-semibold mt-1" style={{ fontFamily: 'var(--font-dm-serif)' }}>
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
                        className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-red-500 transition-colors"
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
          <div className="px-6 py-5 border-t border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-gray-400">Total</span>
              <span className="text-2xl text-red-600" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                ${totalPrice.toLocaleString('es-CO')}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 flex items-center justify-center gap-3 transition-colors active:scale-[0.99] text-sm font-medium uppercase tracking-[0.1em]"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.122 1.529 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.214-3.727.972.994-3.627-.234-.373A9.818 9.818 0 1112 21.818z"/>
              </svg>
              Pedir por WhatsApp
            </button>
            <button
              onClick={clearCart}
              className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-black transition-colors text-center"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
