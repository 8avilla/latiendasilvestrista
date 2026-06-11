'use client';

import { useState } from 'react';
import { Product, Category } from '@/types';
import ProductCard from '@/components/ProductCard';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'camisetas', label: 'Camisetas' },
  { value: 'sombreros', label: 'Sombreros' },
  { value: 'gorras', label: 'Gorras' },
  { value: 'manillas', label: 'Manillas' },
  { value: 'vasos', label: 'Vasos' },
];

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const [active, setActive] = useState<Category>('todos');

  const filtered =
    active === 'todos' ? products : products.filter((p) => p.category === active);

  return (
    <section className="flex flex-col gap-10">

      {/* Editorial category tabs */}
      <div className="relative border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActive(cat.value)}
              className={`relative pb-3 text-xs font-medium uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-200 ${
                active === cat.value
                  ? 'text-red-600'
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              {cat.label}
              {active === cat.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Product count */}
      <p className="text-xs text-red-600 uppercase tracking-widest -mt-6">
        {filtered.length} {filtered.length !== 1 ? 'productos' : 'producto'}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
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
