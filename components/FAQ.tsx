'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: '¿Cómo realizo mi pedido?',
    a: 'Selecciona los productos que deseas, agrégalos al carrito y al finalizar se abrirá WhatsApp automáticamente con tu pedido listo. Un asesor te confirmará disponibilidad, total y forma de envío.',
  },
  {
    q: '¿Hacen envíos a toda Colombia?',
    a: 'Sí. Realizamos envíos a cualquier municipio de Colombia a través de empresas de mensajería. El costo y tiempo de entrega dependen de tu ubicación y se confirman por WhatsApp.',
  },
  {
    q: '¿Cuáles son los métodos de pago?',
    a: 'Aceptamos transferencias bancarias, Nequi, Daviplata y pagos en efectivo contra entrega según ciudad. Los detalles se coordinan directamente por WhatsApp.',
  },
  {
    q: '¿Los productos son oficiales?',
    a: 'Sí. Todos los artículos disponibles en La Tienda Silvestrista son de colección oficial del movimiento silvestrista de Silvestre Dangond.',
  },
  {
    q: '¿Cuánto demora en llegar mi pedido?',
    a: 'El tiempo de entrega varía entre 2 y 5 días hábiles según tu ubicación. Ciudades principales como Bogotá, Medellín, Cali y Barranquilla suelen recibir en 2–3 días.',
  },
  {
    q: '¿Puedo cambiar o devolver un producto?',
    a: 'Atendemos cambios por talla o defecto de fabricación dentro de los 5 días hábiles después de recibir tu pedido. Comunícate por WhatsApp con fotos del artículo para coordinar.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-gray-100 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.22em] text-red-600 font-semibold mb-4">
            <span className="mr-2">✦</span>Ayuda
          </p>
          <h2 className="text-4xl sm:text-5xl leading-tight text-black">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {FAQS.map((faq, i) => (
            <div key={i} className="py-5">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between text-left gap-4 group"
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-black group-hover:text-red-600 transition-colors duration-200 leading-snug">
                  {faq.q}
                </span>
                <span
                  className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-300 text-sm font-light leading-none ${
                    open === i
                      ? 'rotate-45 border-red-600 text-red-600'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  open === i ? 'max-h-48 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-sm text-gray-500 leading-relaxed font-light">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
