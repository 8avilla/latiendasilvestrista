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
    <article className="group flex flex-col h-full">

      {/* Image — fixed aspect, full cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 shrink-0">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      {/* Info — ocupa el espacio restante */}
      <div className="flex-1 flex flex-col pt-3 gap-1">

        {/* Categoría — 1 línea fija */}
        <p className="text-[10px] uppercase tracking-[0.18em] text-red-600 font-semibold leading-none">
          {product.category}
        </p>

        {/* Nombre — siempre 2 líneas */}
        <h3 className="text-sm font-medium text-black leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Variantes — altura fija reservada siempre */}
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

        {/* Precio — empujado al fondo */}
        <p
          className="mt-auto pt-2 text-base text-red-600 font-semibold"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          ${product.price.toLocaleString('es-CO')}
        </p>
      </div>

      {/* Botón — siempre al fondo de la card */}
      <button
        onClick={handleAdd}
        className={`mt-3 w-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors shrink-0 ${
          added
            ? 'bg-black text-white'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {added ? '¡Añadido!' : '+ Añadir al carrito'}
      </button>

    </article>
  );
}
