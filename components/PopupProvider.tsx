'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import Image from 'next/image';

interface PopupContextValue {
  openPopup: (onAccept: () => void, image: string) => void;
}

const PopupContext = createContext<PopupContextValue>({ openPopup: (fn) => fn() });

export function usePopup() {
  return useContext(PopupContext);
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const [modalImage, setModalImage] = useState('');
  const [pendingAccept, setPendingAccept] = useState<(() => void) | null>(null);

  const openPopup = useCallback((onAccept: () => void, image: string) => {
    if (!image) {
      onAccept();
      return;
    }
    setModalImage(image);
    setPendingAccept(() => onAccept);
  }, []);

  function handleAccept() {
    pendingAccept?.();
    setPendingAccept(null);
  }

  function handleClose() {
    setPendingAccept(null);
  }

  useEffect(() => {
    if (!pendingAccept) return;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [pendingAccept]);

  return (
    <PopupContext.Provider value={{ openPopup }}>
      {children}

      {pendingAccept && modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-xl animate-fade-up">
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative w-full aspect-[4/3] bg-gray-100">
              <Image
                src={modalImage}
                alt="Aviso"
                fill
                sizes="(max-width: 640px) 100vw, 576px"
                className="object-cover"
                priority
              />
            </div>

            <div className="p-5">
              <button
                onClick={handleAccept}
                className="w-full bg-black hover:bg-gray-800 active:scale-[0.98] text-white py-3.5 text-sm font-semibold uppercase tracking-widest rounded-xl transition-all duration-200"
              >
                Aceptar y agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}
