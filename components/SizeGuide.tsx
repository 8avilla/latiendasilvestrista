'use client';

const SIZES = [
  { talla: 'S',   pecho: '91 – 96',  largo: '67',  hombros: '40' },
  { talla: 'M',   pecho: '97 – 102', largo: '69',  hombros: '42' },
  { talla: 'L',   pecho: '103 – 108',largo: '71',  hombros: '44' },
  { talla: 'XL',  pecho: '109 – 115',largo: '73',  hombros: '46' },
  { talla: 'XXL', pecho: '116 – 122',largo: '75',  hombros: '48' },
];

const STEPS = [
  {
    num: '01',
    title: 'Pecho',
    desc: 'Pasa la cinta métrica por la parte más ancha del pecho, justo por debajo de las axilas. Mantén los brazos relajados.',
  },
  {
    num: '02',
    title: 'Largo',
    desc: 'Mide desde el punto más alto del hombro hasta donde deseas que llegue la camiseta. Mantén la cinta recta y sin tensión.',
  },
  {
    num: '03',
    title: 'Hombros',
    desc: 'Mide de costura a costura por la espalda. Es el ancho que va desde un hombro hasta el otro en línea recta.',
  },
];

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573004340482';

export default function SizeGuide() {
  function openWhatsApp() {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, necesito ayuda para encontrar mi talla en Verzus.')}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <section id="tallas" className="border-t border-gray-100 bg-gray-50/60 py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">

        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-black font-semibold mb-4">
            <span className="mr-2">✦</span>Guía de tallas
          </p>
          <h2 className="text-4xl sm:text-5xl leading-tight text-black mb-4">
            Encuentra tu talla<br className="hidden sm:block" /> con confianza
          </h2>
          <p className="text-sm text-gray-500 font-light max-w-md mx-auto leading-relaxed">
            Tres medidas son todo lo que necesitas. Toma tu cinta métrica y sigue
            estos pasos antes de elegir tu camiseta Verzus.
          </p>
        </div>

        {/* Cómo medirse */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(step => (
            <div 
              key={step.num} 
              className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1 rounded-xl p-6 flex flex-col gap-3 transition-all duration-350 ease-out group/step"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-black font-semibold group-hover/step:tracking-[0.25em] transition-all duration-300">
                {step.num}
              </span>
              <p className="text-base font-medium text-black transition-colors duration-300 group-hover/step:text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Tabla de tallas */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="text-left px-3 sm:px-5 py-3 sm:py-3.5 text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-gray-400 font-semibold">
                  Talla
                </th>
                <th className="text-left px-3 sm:px-5 py-3 sm:py-3.5 text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-gray-400 font-semibold">
                  Pecho (cm)
                </th>
                <th className="text-left px-3 sm:px-5 py-3 sm:py-3.5 text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-gray-400 font-semibold">
                  Largo (cm)
                </th>
                <th className="text-left px-3 sm:px-5 py-3 sm:py-3.5 text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-gray-400 font-semibold">
                  Hombros (cm)
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((row, i) => (
                <tr
                  key={row.talla}
                  className={`border-b border-gray-50 last:border-0 transition-colors duration-200 hover:bg-gray-50/20 group/row ${
                    i % 2 === 0 ? '' : 'bg-gray-50/25'
                  }`}
                >
                  <td className="px-3 sm:px-5 py-3 sm:py-3.5 font-semibold text-black group-hover/row:text-black transition-colors tracking-wide">
                    {row.talla}
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-gray-600 group-hover/row:text-gray-900 transition-colors font-light">{row.pecho}</td>
                  <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-gray-600 group-hover/row:text-gray-900 transition-colors font-light">{row.largo}</td>
                  <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-gray-600 group-hover/row:text-gray-900 transition-colors font-light">{row.hombros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accesorios + CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
          <p className="text-xs text-gray-400 leading-relaxed text-center sm:text-left max-w-xs">
            Gorras, sombreros, manillas y vasos son{' '}
            <span className="text-black font-medium">talla única</span>. Si tienes
            dudas sobre algún producto, escríbenos.
          </p>
          <button
            onClick={openWhatsApp}
            className="shrink-0 border-2 border-black text-black hover:bg-black hover:text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-350 cursor-pointer active:scale-95 hover:shadow-md"
          >
            Consultar mi talla →
          </button>
        </div>

      </div>
    </section>
  );
}
