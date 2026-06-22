'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ProductPopupModalProps {
  image: string;
  productName: string;
  onAccept: () => void;
  onClose: () => void;
}

export default function ProductPopupModal({ image, productName, onAccept, onClose }: ProductPopupModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm animate-fade-up">

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Imagen */}
        <div className="relative w-full aspect-[4/3] bg-gray-100">
          <Image
            src={image}
            alt={`Aviso — ${productName}`}
            fill
            sizes="(max-width: 640px) 100vw, 384px"
            className="object-cover"
            priority
          />
        </div>

        {/* Acción */}
        <div className="p-5">
          <button
            onClick={onAccept}
            className="w-full bg-black hover:bg-gray-800 active:scale-[0.98] text-white py-3.5 text-sm font-semibold uppercase tracking-widest rounded-xl transition-all duration-200"
          >
            Aceptar y agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
