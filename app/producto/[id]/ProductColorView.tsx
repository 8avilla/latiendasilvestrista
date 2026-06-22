'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import ProductGallery from './ProductGallery';
import AddToCart from './AddToCart';
import ProductTabs from './ProductTabs';

export default function ProductColorView({ product }: { product: Product }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  function handleSelectionChange(selections: Record<string, string>) {
    for (const group of product.variantGroups ?? []) {
      if (!group.imageMap) continue;
      const selected = selections[group.name];
      if (selected !== undefined && group.imageMap[selected] !== undefined) {
        setActiveImageIndex(group.imageMap[selected]);
        return;
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

      {/* Galería controlada */}
      <ProductGallery
        images={product.images}
        name={product.name}
        freeShipping={product.freeShipping}
        activeIndex={activeImageIndex}
        onActiveIndexChange={setActiveImageIndex}
      />

      {/* Info */}
      <div className="flex flex-col gap-6 lg:py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-black font-semibold mb-2">{product.category}</p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-black leading-tight mb-4"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            {product.name}
          </h1>
          <p
            className="text-3xl font-bold text-black"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            ${product.price.toLocaleString('es-CO')}
            <span className="text-sm font-normal text-gray-400 ml-2">COP</span>
          </p>
        </div>

        <ProductTabs description={product.description} />

        <div id="add-to-cart-section">
          <AddToCart product={product} onSelectionChange={handleSelectionChange} />
        </div>

        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            Envíos a toda Colombia
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Pago seguro con Bold
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
            Calidad garantizada
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-gray-400 hover:text-black transition-colors underline underline-offset-2"
        >
          ← Ver toda la colección
        </Link>
      </div>
    </div>
  );
}
