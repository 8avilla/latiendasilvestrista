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
    <section className="flex flex-col gap-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActive(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active === cat.value
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product count */}
      <p className="text-sm text-gray-400">
        {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400">
          No hay productos en esta categoría aún.
        </div>
      )}
    </section>
  );
}
