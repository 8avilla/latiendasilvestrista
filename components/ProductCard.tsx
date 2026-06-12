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
  const [imgIdx, setImgIdx] = useState(0);

  const images = product.images ?? [];
  const hasMultiple = images.length > 1;
  const currentImage = images[imgIdx] ?? '';

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx(i => (i - 1 + images.length) % images.length);
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx(i => (i + 1) % images.length);
  }

  function handleAdd() {
    addItem(product, selectedVariant);
    openSidebar();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="group flex flex-col h-full">

      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 shrink-0">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Prev / Next arrows — only shown when hovered and multiple images */}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm text-xs"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm text-xs"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === imgIdx ? 'bg-white' : 'bg-white/40'
                }`}
                aria-label={`Ver imagen ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col pt-3 gap-1">

        <p className="text-[10px] uppercase tracking-[0.18em] text-red-600 font-semibold leading-none">
          {product.category}
        </p>

        <h3 className="text-sm font-medium text-black leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="h-8 overflow-hidden flex flex-wrap gap-1 items-start mt-1">
          {product.variants?.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVariant(v)}
              className={`px-2 py-0.5 text-[10px] uppercase tracking-wide border transition-colors shrink-0 ${
                selectedVariant === v
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-gray-300 text-gray-500 hover:border-red-600 hover:text-red-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <p
          className="mt-auto pt-2 text-base text-red-600 font-semibold"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          ${product.price.toLocaleString('es-CO')}
        </p>
      </div>

      <button
        onClick={handleAdd}
        className={`mt-3 w-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors shrink-0 ${
          added ? 'bg-black text-white' : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {added ? '¡Añadido!' : '+ Añadir al carrito'}
      </button>

    </article>
  );
}
