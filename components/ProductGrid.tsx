'use client';

import { useState } from 'react';
import { Product, CategoryDoc } from '@/types';
import ProductCard from '@/components/ProductCard';

interface ProductGridProps {
  products: Product[];
  categories: CategoryDoc[];
}

export default function ProductGrid({ products, categories }: ProductGridProps) {
  const [active, setActive] = useState('todos');

  const filtered = active === 'todos' ? products : products.filter(p => p.category === active);

  const allFilters = [
    { label: 'Todos', value: 'todos' },
    ...categories.map(c => ({ label: c.name, value: c.slug })),
  ];

  return (
    <section className="flex flex-col gap-10">

      {/* Heading con número oversized */}
      <div className="relative">
        <span
          className="absolute -top-6 sm:-top-10 left-0 text-[7rem] sm:text-[10rem] font-black text-gray-100/80 leading-none select-none pointer-events-none"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
          aria-hidden="true"
        >
          01
        </span>
        <div className="relative pt-4">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-black font-semibold mb-2">
            <span>✦</span> Catálogo
          </p>
          <h2 className="text-4xl sm:text-5xl text-black">Colección</h2>
        </div>
      </div>

      {/* Filtros pill */}
      <div className="flex gap-2 flex-wrap">
        {allFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setActive(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 border ${
              active === f.value
                ? 'bg-black text-white border-black shadow-sm'
                : 'border-gray-200 text-gray-500 hover:border-gray-800 hover:text-black bg-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 uppercase tracking-widest -mt-6">
        {filtered.length} {filtered.length !== 1 ? 'productos' : 'producto'}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={i < 4}
              delay={Math.min(i, 7) * 70}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-300 text-sm tracking-widest uppercase">
          Sin productos en esta categoría
        </div>
      )}

    </section>
  );
}
