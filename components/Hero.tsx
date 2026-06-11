'use client';

import Image from 'next/image';

const WHATSAPP_NUMBER = '573002493031';

const CHIPS = [
  'Movimiento Silvestrista',
  'Colección oficial',
  'Envíos a Colombia',
  'Pedido por WhatsApp',
];

export default function Hero() {
  function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  function openWhatsApp() {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

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

        {/* Botones */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={scrollToCatalog}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            Ver colección →
          </button>
          <button
            onClick={openWhatsApp}
            className="border-2 border-black text-black hover:bg-black hover:text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            Pedir por WhatsApp
          </button>
        </div>

        {/* Tagline */}
        <p
          className="text-xs text-gray-400"
          style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic' }}
        >
          Pedidos coordinados por WhatsApp · Envíos a toda Colombia
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
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none">
        <Image
          src="/images/camiseta_100_anos.jpg"
          alt="Camiseta 100 Años — Edición Especial"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 90vw, 50vw"
        />
        {/* Badge sobre la imagen */}
        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full">
          Edición especial
        </div>
      </div>

    </section>
  );
}
