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

  return (
    <section className="flex flex-col gap-10">

      <div className="relative border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto pb-0 scrollbar-none">
          <button
            onClick={() => setActive('todos')}
            className={`relative pb-3 text-xs font-medium uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-200 ${
              active === 'todos' ? 'text-red-600' : 'text-gray-400 hover:text-black'
            }`}
          >
            Todos
            {active === 'todos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.slug)}
              className={`relative pb-3 text-xs font-medium uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-200 ${
                active === cat.slug ? 'text-red-600' : 'text-gray-400 hover:text-black'
              }`}
            >
              {cat.name}
              {active === cat.slug && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-red-600 uppercase tracking-widest -mt-6">
        {filtered.length} {filtered.length !== 1 ? 'productos' : 'producto'}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {filtered.map(product => (
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
