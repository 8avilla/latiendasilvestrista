'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/components/CartProvider';
import ProductPopupModal from '@/components/ProductPopupModal';

export default function AddToCart({ product }: { product: Product }) {
  const { addItem, openSidebar } = useCart();
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of product.variantGroups ?? []) {
      if (g.options.length > 0) init[g.name] = g.options[0];
    }
    return init;
  });
  const [added, setAdded] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  function doAdd() {
    addItem(product, Object.keys(selections).length > 0 ? selections : undefined);
    openSidebar();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleAdd() {
    if (product.popup?.enabled && product.popup?.image) {
      setPopupOpen(true);
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
            {group.options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setSelections(prev => ({ ...prev, [group.name]: opt }))}
                className={`px-4 py-2 text-xs uppercase tracking-wide rounded-full border transition-all duration-150 ${
                  selections[group.name] === opt
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-600 hover:border-black hover:text-black'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        disabled={product.soldOut}
        className={`w-full py-4 text-sm font-semibold uppercase tracking-widest rounded-xl transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${
          product.soldOut
            ? 'bg-gray-100 text-gray-400'
            : added
              ? 'bg-black text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {product.soldOut ? 'Producto agotado' : added ? '✓ ¡Añadido al carrito!' : '+ Añadir al carrito'}
      </button>

      {popupOpen && product.popup?.image && (
        <ProductPopupModal
          image={product.popup.image}
          productName={product.name}
          onAccept={() => { setPopupOpen(false); doAdd(); }}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  );
}
