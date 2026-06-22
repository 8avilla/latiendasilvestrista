'use client';

import { useState } from 'react';
import { Product } from '@/types';

function isHexColor(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}
import { useCart } from '@/components/CartProvider';
import { usePopup } from '@/components/PopupProvider';
import { trackEvent } from '@/lib/sessionId';

export default function AddToCart({
  product,
  onSelectionChange,
}: {
  product: Product;
  onSelectionChange?: (sel: Record<string, string>) => void;
}) {
  const { addItem, openSidebar } = useCart();
  const { openPopup } = usePopup();
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of product.variantGroups ?? []) {
      if (g.options.length > 0) init[g.name] = g.options[0];
    }
    return init;
  });
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const doAdd = () => {
      addItem(product, Object.keys(selections).length > 0 ? selections : undefined);
      openSidebar();
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      trackEvent('add_to_cart', { productId: product.id, productName: product.name, price: product.price });
    };
    if (product.showPopup && product.popupImage) {
      openPopup(doAdd, product.popupImage);
    } else {
      doAdd();
    }
  }

  const groups = product.variantGroups ?? [];

  return (
    <div className="flex flex-col gap-5">
      {groups.map(group => (
        <div key={group.name}>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.options.map(opt => {
              const isColor = isHexColor(opt);
              const selected = selections[group.name] === opt;
              return isColor ? (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = { ...selections, [group.name]: opt };
                    setSelections(next);
                    onSelectionChange?.(next);
                  }}
                  title={opt}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                    selected
                      ? 'border-black ring-2 ring-black ring-offset-1'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: opt }}
                />
              ) : (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = { ...selections, [group.name]: opt };
                    setSelections(next);
                    onSelectionChange?.(next);
                  }}
                  className={`px-4 py-2 text-xs uppercase tracking-wide rounded-full border transition-all duration-150 ${
                    selected
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-600 hover:border-black hover:text-black'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Urgencia por últimas unidades (manual) */}
      {!product.soldOut && product.lastUnits && !(product.stockTracked && product.stock != null && product.stock > 0 && product.stock <= 5) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-orange-50 text-orange-600 border border-orange-200">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          ¡Últimas unidades disponibles — no te quedes sin el tuyo!
        </div>
      )}

      {/* Urgencia por stock bajo */}
      {!product.soldOut && product.stockTracked && product.stock != null && product.stock > 0 && product.stock <= 5 && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold ${
          product.stock <= 2
            ? 'bg-gray-50 text-black border border-gray-200'
            : 'bg-orange-50 text-orange-600 border border-orange-200'
        }`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {product.stock <= 2
            ? `¡${product.stock === 1 ? 'Queda solo 1 unidad' : `Quedan solo ${product.stock} unidades`}!`
            : `Solo ${product.stock} disponibles — ¡no te quedes sin el tuyo!`}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={product.soldOut}
        className={`w-full py-4 text-sm font-semibold uppercase tracking-widest rounded-xl transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${
          product.soldOut
            ? 'bg-gray-100 text-gray-400'
            : added
              ? 'bg-black text-white'
              : 'bg-black hover:bg-gray-800 text-white'
        }`}
      >
        {product.soldOut ? 'Producto agotado' : added ? '✓ ¡Añadido al carrito!' : '+ Añadir al carrito'}
      </button>

    </div>
  );
}
