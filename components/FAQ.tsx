'use client';

import { useState } from 'react';
import Link from 'next/link';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '573004340482';
const WA_PAGO_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, tuve un problema con mi pago en Verzus. ¿Me pueden ayudar?')}`;

const FAQS = [
  {
    q: '¿Cómo realizo mi pedido?',
    a: 'Selecciona los productos que quieres, agrégalos al carrito y ve a pagar. Llenas tus datos de envío y pagas en línea con tarjeta débito, crédito o PSE a través de Bold.co. Recibirás un correo de confirmación al instante.',
  },
  {
    q: '¿Cuánto cuesta el envío?',
    a: 'El envío tiene un costo fijo de $20.000 a cualquier municipio de Colombia. Sin importar cuántos productos compres ni a qué ciudad, el valor del domicilio siempre es el mismo.',
  },
  {
    q: '¿Cuánto demora en llegar mi pedido?',
    a: 'Una vez confirmado el pago, tu pedido se despacha en 1–2 días hábiles. El tiempo de entrega es de 2 a 5 días hábiles adicionales según tu ciudad. Ciudades principales como Bogotá, Medellín, Cali y Barranquilla suelen recibir en 2–3 días hábiles.',
  },
  {
    q: '¿Cómo sé dónde está mi pedido?',
    a: 'Cuando tu pedido sea despachado recibirás un correo con el número de guía. También puedes consultar el estado de tu pedido en cualquier momento en la sección "Seguimiento" de nuestra tienda ingresando el número de tu orden.',
  },
  {
    q: '¿Es seguro pagar en línea?',
    a: 'Sí. Todos los pagos se procesan a través de Bold.co, pasarela de pagos certificada y regulada en Colombia. Nosotros nunca recibimos ni almacenamos los datos de tu tarjeta. La transacción está protegida con cifrado SSL.',
  },
  {
    q: '¿Qué hago si mi pago falló?',
    a: 'Si el pago no se completó, tu pedido queda en estado "pendiente" y puedes intentarlo de nuevo desde el carrito sin perder tus productos. Si el problema persiste, escríbenos y te ayudamos a completar el pago.',
    link: { href: WA_PAGO_URL, label: 'Escribir al WhatsApp' },
  },
  {
    q: '¿De dónde es Verzus?',
    a: 'Verzus es una marca colombiana de ropa para gente como tú. Diseños exclusivos en camisetas, gorras y accesorios que hablan por sí solos. Hecho en Colombia, para Colombia y el mundo.',
  },
  {
    q: '¿Puedo cambiar la talla o devolver un producto?',
    a: 'Atendemos cambios por talla o defecto de fabricación dentro de los 5 días hábiles de haber recibido tu pedido. Escríbenos por WhatsApp con fotos del producto y lo coordinamos contigo.',
  },
];

interface FAQItem {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = FAQS as FAQItem[];

  return (
    <section id="faq" className="border-t border-gray-100 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.22em] text-black font-semibold mb-4">
            <span className="mr-2">✦</span>Ayuda
          </p>
          <h2 className="text-4xl sm:text-5xl leading-tight text-black">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border rounded-xl px-5 py-4 transition-all duration-300 ${
                open === i 
                  ? 'bg-gray-50/10 border-gray-200 shadow-sm' 
                  : 'border-gray-100/80 bg-white hover:bg-gray-50/50 hover:border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer"
                aria-expanded={open === i}
              >
                <span className={`text-sm font-medium transition-colors duration-300 leading-snug ${
                  open === i ? 'text-black' : 'text-black group-hover:text-black'
                }`}>
                  {faq.q}
                </span>
                <span
                  className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-300 text-xs font-medium leading-none ${
                    open === i
                      ? 'rotate-[135deg] border-black bg-black text-white'
                      : 'border-gray-300 text-gray-400 group-hover:border-black group-hover:text-black'
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  open === i ? 'max-h-64 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-sm text-gray-500 leading-relaxed font-light pt-1">
                  {faq.a}
                </p>
                {faq.link && (
                  <Link
                    href={faq.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {faq.link.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
