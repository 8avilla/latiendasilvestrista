'use client';
import Image from 'next/image';

const CHIPS = [
  'Movimiento Silvestrista',
  'Colección oficial',
  'Envíos a Colombia',
  'Pago seguro en línea',
];

export default function Hero() {
  function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 lg:items-stretch">

      {/* ── Columna texto ── */}
      <div className="flex flex-col gap-6 order-2 lg:order-1">

        {/* Tag */}
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-red-600 font-semibold">
          <span className="text-base leading-none">✦</span>
          Colección oficial
        </p>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          <span className="text-black block">Silvestre,</span>
          <span className="italic text-red-600 block">hecho moda.</span>
        </h1>

        {/* Descripción */}
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Viste los colores del rey del vallenato. Camisetas, gorras, sombreros,
          manillas y vasos con el sello inconfundible del movimiento silvestrista.
        </p>

        {/* Botón */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={scrollToCatalog}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            Ver colección →
          </button>
        </div>

        {/* Tagline */}
        <p
          className="text-xs text-gray-400"
          style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic' }}
        >
          Pago seguro en línea · Envíos a toda Colombia
        </p>

        {/* Feature chips */}
        <div className="grid grid-cols-2 gap-2">
          {CHIPS.map((chip) => (
            <div
              key={chip}
              className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-600"
            >
              <span className="text-red-600 font-bold leading-none">·</span>
              {chip}
            </div>
          ))}
        </div>
      </div>

      {/* ── Columna imagen ── */}
      <div className="relative order-1 lg:order-2 w-full rounded-2xl overflow-hidden min-h-[280px] lg:min-h-0">
        <Image
          src="/images/portada.jpeg"
          alt="Tienda Silvestrista"
          fill
          className="object-cover"
          priority
        />
      </div>

    </section>
  );
}
