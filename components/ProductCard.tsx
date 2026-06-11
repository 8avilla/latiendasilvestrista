'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Product } from '@/types';
import { useCart } from '@/components/CartProvider';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, openSidebar } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    product.variants?.[0]
  );
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, selectedVariant);
    openSidebar();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-4"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</h3>
        <p className="text-gray-500 text-xs leading-relaxed flex-1">{product.description}</p>

        {product.variants && product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.variants.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariant(v)}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  selectedVariant === v
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-red-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-gray-900">
            ${product.price.toLocaleString('es-CO')}
          </span>
          <button
            onClick={handleAdd}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              added
                ? 'bg-red-100 text-red-700'
                : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
            }`}
          >
            {added ? '¡Añadido!' : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
  );
}
