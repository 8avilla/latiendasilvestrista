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
    <article className="group flex flex-col">

      {/* Image — full-bleed, portrait */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors duration-300" />

        {/* Hover CTA — slides up */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <button
            onClick={handleAdd}
            className={`w-full py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
              added
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-red-600 hover:text-white'
            }`}
          >
            {added ? '¡Añadido!' : '+ Añadir al carrito'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-red-600 font-semibold">
          {product.category}
        </p>
        <h3 className="text-sm font-medium text-black leading-snug">
          {product.name}
        </h3>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.variants.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariant(v)}
                className={`px-2 py-0.5 text-[10px] uppercase tracking-wide border transition-colors ${
                  selectedVariant === v
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-gray-300 text-gray-500 hover:border-red-600 hover:text-red-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <p
          className="text-base text-red-600 font-semibold mt-1"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          ${product.price.toLocaleString('es-CO')}
        </p>
      </div>

    </article>
  );
}
