'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Product } from '@/types';
import { useCart } from '@/components/CartProvider';
import { usePopup } from '@/components/PopupProvider';
import { trackEvent } from '@/lib/sessionId';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  delay?: number;
}

function initSelections(product: Product): Record<string, string> {
  const result: Record<string, string> = {};
  for (const group of product.variantGroups ?? []) {
    if (group.options.length > 0) result[group.name] = group.options[0];
  }
  return result;
}

export default function ProductCard({ product, priority = false, delay = 0 }: ProductCardProps) {
  const { addItem, openSidebar } = useCart();
  const { openPopup } = usePopup();
  const [selections, setSelections] = useState<Record<string, string>>(() => initSelections(product));
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  const images = product.images ?? [];
  const hasMultiple = images.length > 1;
  const currentImage = images[imgIdx] ?? '';

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    <article
      ref={cardRef}
      style={{ animationDelay: `${delay}ms` }}
      className={`group flex flex-col h-full rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-shadow duration-300 ${
        visible ? 'animate-fade-up' : 'opacity-0'
      }`}
    >
      {/* Imagen */}
      <Link href={`/producto/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100 shrink-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {currentImage ? (
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}

        {/* Overlay hover — sólo desktop */}
        <div className="absolute inset-0 bg-black/0 lg:group-hover:bg-black/15 transition-colors duration-500" />

        {/* Badge de precio */}
        <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-full shadow-md">
          <span
            className="text-sm font-bold text-black leading-none"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            ${product.price.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Badge agotado */}
        {product.soldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-black text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow">
              Agotado
            </span>
          </div>
        )}

        {/* Badge stock bajo / últimas unidades */}
        {!product.soldOut && product.stockTracked && product.stock != null && product.stock > 0 && product.stock <= 5 && (
          <div className={`absolute top-3 right-3 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full shadow-sm ${
            product.stock <= 2 ? 'bg-gray-500 animate-pulse' : 'bg-orange-400'
          }`}>
            {product.stock <= 2 ? `¡Último${product.stock === 1 ? '' : 's'}! ${product.stock}` : `Solo ${product.stock} disponibles`}
          </div>
        )}
        {!product.soldOut && product.lastUnits && !(product.stockTracked && product.stock != null && product.stock > 0 && product.stock <= 5) && (
          <div className="absolute top-3 right-3 bg-orange-500 animate-pulse text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full shadow-sm">
            Últimas unidades
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={prev}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shadow-sm text-base font-medium"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shadow-sm text-base font-medium"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    i === imgIdx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 flex flex-col p-4 gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-black font-semibold leading-none">
          {product.category}
        </p>
        <Link href={`/producto/${product.id}`} className="hover:text-black transition-colors">
          <h3 className="text-sm font-medium text-black leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>

        {/* Variantes */}
        <div className="flex flex-col gap-2 mt-1 min-h-[2rem]">
          {groups.map(group => (
            <div key={group.name} className="flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{group.name}</p>
              <div className="flex flex-wrap gap-1">
                {group.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelections(prev => ({ ...prev, [group.name]: opt }))}
                    className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wide rounded-full border transition-all duration-150 shrink-0 ${
                      selections[group.name] === opt
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAdd}
          disabled={product.soldOut}
          className={`w-full py-3 text-xs font-semibold uppercase tracking-[0.15em] rounded-xl transition-all duration-200 active:scale-[0.97] select-none disabled:cursor-not-allowed ${
            product.soldOut
              ? 'bg-gray-100 text-gray-400'
              : added
                ? 'bg-black text-white btn-cart-added'
                : 'bg-black hover:bg-gray-800 text-white'
          }`}
        >
          {product.soldOut ? 'Agotado' : added ? '✓ ¡Añadido!' : '+ Añadir al carrito'}
        </button>
      </div>

    </article>
  );
}
