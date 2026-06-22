'use client';
import Image from 'next/image';

const CHIPS = [
  'Ropa para gente como tú',
  'Diseños exclusivos',
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
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-black font-semibold">
          <span className="text-base leading-none">✦</span>
          Nueva colección
        </p>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          <span className="text-black block">Ropa hecha</span>
          <span className="italic text-black block">para ti.</span>
        </h1>

        {/* Descripción */}
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Verzus es una marca de ropa para gente como tú. Camisetas, gorras y accesorios
          con diseños exclusivos que dicen quién eres sin decir nada.
        </p>

        {/* Botón */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={scrollToCatalog}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
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
              <span className="text-black font-bold leading-none">·</span>
              {chip}
            </div>
          ))}
        </div>
      </div>

      {/* ── Columna imagen ── */}
      <div className="relative order-1 lg:order-2 w-full rounded-2xl overflow-hidden aspect-square lg:aspect-auto lg:min-h-0">
        <Image
          src="/images/portada.jpeg"
          alt="Verzus"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

    </section>
  );
}
