'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { Product } from '@/types';
import { useCart } from '@/components/CartProvider';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

function initSelections(product: Product): Record<string, string> {
  const result: Record<string, string> = {};
  for (const group of product.variantGroups ?? []) {
    if (group.options.length > 0) result[group.name] = group.options[0];
  }
  return result;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addItem, openSidebar } = useCart();
  const [selections, setSelections] = useState<Record<string, string>>(() => initSelections(product));
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const images = product.images ?? [];
  const hasMultiple = images.length > 1;
  const currentImage = images[imgIdx] ?? '';
  const touchStartX = useRef<number | null>(null);

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx(i => (i - 1 + images.length) % images.length);
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx(i => (i + 1) % images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !hasMultiple) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 40) return;
    setImgIdx(i => delta > 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length);
    touchStartX.current = null;
  }

  function handleAdd() {
    addItem(product, Object.keys(selections).length > 0 ? selections : undefined);
    openSidebar();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const groups = product.variantGroups ?? [];

  return (
    <article className="group flex flex-col h-full">

      {/* Image */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-gray-100 shrink-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {hasMultiple && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shadow-sm text-base font-medium" aria-label="Imagen anterior">‹</button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shadow-sm text-base font-medium" aria-label="Imagen siguiente">›</button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} aria-label={`Ver imagen ${i + 1}`} />
              ))}
            </div>
          </>
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

        {/* Grupos de variantes */}
        <div className="flex flex-col gap-2 mt-1 min-h-[2rem]">
          {groups.map(group => (
            <div key={group.name} className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{group.name}</p>
              <div className="flex flex-wrap gap-1">
                {group.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelections(prev => ({ ...prev, [group.name]: opt }))}
                    className={`px-2 py-0.5 text-[10px] uppercase tracking-wide border transition-colors shrink-0 ${
                      selections[group.name] === opt
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-gray-300 text-gray-500 hover:border-red-600 hover:text-red-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-2 text-base text-red-600 font-semibold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          ${product.price.toLocaleString('es-CO')}
        </p>
      </div>

      <button
        onClick={handleAdd}
        style={{
          background: added
            ? 'linear-gradient(135deg, #111827 0%, #000000 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        }}
        className={`mt-3 w-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-[transform,box-shadow] duration-200 shrink-0 active:scale-[0.97] text-white select-none${added ? ' btn-cart-added' : ''}`}
      >
        {added ? '✓ ¡Añadido!' : '+ Añadir al carrito'}
      </button>

    </article>
  );
}
