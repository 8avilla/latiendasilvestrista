'use client';

import { useState } from 'react';

type Section = { id: string; label: string; content: React.ReactNode };

function AccordionItem({
  section,
  open,
  onToggle,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-semibold text-black">{section.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <div className="text-sm text-gray-600 leading-relaxed space-y-2">
          {section.content}
        </div>
      </div>
    </div>
  );
}

export default function ProductTabs({ description }: { description?: string }) {
  const [openId, setOpenId] = useState<string | null>('desc');

  const sections: Section[] = [
    {
      id: 'desc',
      label: 'Descripción',
      content: description ? (
        <p>{description}</p>
      ) : (
        <p className="text-gray-400 italic">Sin descripción disponible.</p>
      ),
    },
    {
      id: 'envio',
      label: 'Envío',
      content: (
        <>
          <p>
            Realizamos envíos a todo el territorio colombiano. El tiempo estimado de entrega es de{' '}
            <strong className="text-black">3 a 7 días hábiles</strong> según tu municipio.
          </p>
          <p>El costo del domicilio se calcula al momento de confirmar tu pedido.</p>
        </>
      ),
    },
    {
      id: 'garantia',
      label: 'Garantía y cambios',
      content: (
        <p>
          Todos nuestros productos pasan por un riguroso control de calidad. Si tienes algún
          inconveniente con tu pedido, contáctanos y lo resolvemos.
        </p>
      ),
    },
  ];

  return (
    <div className="border-t border-gray-100">
      {sections.map(s => (
        <AccordionItem
          key={s.id}
          section={s}
          open={openId === s.id}
          onToggle={() => setOpenId(prev => (prev === s.id ? null : s.id))}
        />
      ))}
    </div>
  );
}
