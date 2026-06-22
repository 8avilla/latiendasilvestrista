'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useCart, buildSelectionsKey } from '@/components/CartProvider';
import { DEPARTMENTS } from '@/lib/colombia';
import { trackEvent, getSessionId } from '@/lib/sessionId';
import Link from 'next/link';
import Image from 'next/image';

interface BoldCheckoutInstance {
  open: () => void;
}

interface BoldWindow extends Window {
  BoldCheckout?: new (config: {
    apiKey: string | undefined;
    amount: string;
    currency: string;
    orderId: string;
    integritySignature: string;
    redirectionUrl: string;
    originUrl: string;
  }) => BoldCheckoutInstance;
}


function formatSelections(selections?: Record<string, string>): string {
  if (!selections || Object.keys(selections).length === 0) return '';
  return Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', ');
}

export default function CarritoPage() {
  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const sessionId = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }, []);

  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    address: '',
    department: '',
    city: '',
    phone: '',
    email: '',
  });

  const [shippingRates, setShippingRates] = useState<{ defaultPrice: number; rates: Record<string, number> } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingStep, setLoadingStep] = useState('');
  const [boldReady, setBoldReady] = useState(false);
  // Reutilizar el mismo pedido en reintentos de la misma sesión
  const pendingOrderId = useRef<string | null>(null);
  const pendingOrderTotal = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(setShippingRates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const boldWindow = window as unknown as BoldWindow;
    if (boldWindow.BoldCheckout) { setBoldReady(true); return; }
    const interval = setInterval(() => {
      if ((window as unknown as BoldWindow).BoldCheckout) {
        setBoldReady(true);
        clearInterval(interval);
      }
    }, 300);
    const timeout = setTimeout(() => clearInterval(interval), 15000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !checkoutTracked.current) {
      checkoutTracked.current = true;
      trackEvent('checkout_start');
    }
  }, [items]);

  // Track cart abandonment: post to /api/abandonos when email is filled and items exist
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingDetails.email) || items.length === 0) return;

    const timer = setTimeout(() => {
      fetch('/api/abandonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          name: shippingDetails.name,
          email: shippingDetails.email,
          phone: shippingDetails.phone,
          city: shippingDetails.city,
          items: items.map(i => ({ product: { name: i.product.name, price: i.product.price }, quantity: i.quantity })),
          total: totalPrice,
        }),
      }).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [shippingDetails.email, shippingDetails.name, shippingDetails.phone, shippingDetails.city, items, totalPrice]);

  // Si el carrito cambia, invalidar el pedido pendiente cacheado
  const itemsKey = items.map(i => `${i.product.id}:${i.quantity}`).join(',');
  useEffect(() => {
    pendingOrderId.current = null;
    pendingOrderTotal.current = null;
  }, [itemsKey]);

  const selectedDeptMunicipalities = DEPARTMENTS.find(d => d.name === shippingDetails.department)?.municipalities ?? [];
  const shippingPrice: number | null = (() => {
    if (!shippingDetails.city) return null;
    if (!shippingRates) return null;
    return shippingRates.rates[shippingDetails.city] ?? shippingRates.defaultPrice;
  })();
  const grandTotal = shippingPrice !== null ? totalPrice + shippingPrice : totalPrice;



  async function handleBoldCheckout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    setLoadingStep('Verificando...');

    try {
      // 1. Validar que BoldCheckout esté cargado en el objeto global window
      const boldWindow = window as unknown as BoldWindow;
      if (!boldWindow.BoldCheckout) {
        throw new Error('El sistema de pagos está cargando. Espera un momento e intenta de nuevo.');
      }

      // 2. Crear pedido o reutilizar el existente si el total no cambió
      let orderId: string;
      const canReuse = pendingOrderId.current && pendingOrderTotal.current === grandTotal;
      if (canReuse) {
        orderId = pendingOrderId.current!;
      } else {
        setLoadingStep('Registrando pedido...');
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            totalPrice: grandTotal,
            shippingPrice: shippingPrice ?? 0,
            shippingDetails,
            paymentMethod: 'BOLD',
            status: 'PAGO PENDIENTE',
            salesChannel: 'Tienda Online',
            analyticsSessionId: getSessionId(),
          }),
        });

        const orderData = await orderResponse.json();
        if (!orderResponse.ok) {
          throw new Error(orderData.error || 'Error al registrar el pedido.');
        }

        orderId = orderData.orderId;
        pendingOrderId.current = orderId;
        pendingOrderTotal.current = grandTotal;
      }

      // 3. Generar la firma de integridad en el servidor (SHA-256)
      setLoadingStep('Preparando pago seguro...');
      const signatureResponse = await fetch('/api/checkout/bold/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: String(Math.round(grandTotal)),
          currency: 'COP',
        }),
      });

      const signatureData = await signatureResponse.json();
      if (!signatureResponse.ok) {
        throw new Error(signatureData.error || 'Error al validar la firma de la transacción.');
      }

      const { signature } = signatureData;

      // 4. Instanciar y abrir la pasarela
      setLoadingStep('Abriendo pasarela...');
      const baseOrigin = window.location.origin.includes('localhost')
        ? 'https://verzus.com'
        : window.location.origin.replace('http://', 'https://');

      const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY;
      if (!apiKey) {
        throw new Error('La llave pública de Bold (API Key) no se ha cargado. Por favor, asegúrate de haber reiniciado el servidor de desarrollo después de agregarla al archivo .env');
      }

      const checkout = new boldWindow.BoldCheckout({
        apiKey: apiKey,
        amount: String(Math.round(grandTotal)),
        currency: 'COP',
        orderId: orderId,
        integritySignature: signature,
        redirectionUrl: `${baseOrigin}/checkout/success?orderId=${orderId}`,
        originUrl: `${baseOrigin}/carrito`,
      });

      checkout.open();
    } catch (error) {
      console.error('Error al procesar checkout:', error);
      const message = error instanceof Error ? error.message : 'Error inesperado al iniciar el pago digital.';
      setSubmitError(message);
      trackEvent('payment_error', { error: message, ua: navigator.userAgent });
    } finally {
      setIsSubmitting(false);
      setLoadingStep('');
    }
  }

  return (
    <main className="flex-1 bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-serif text-black italic mb-8 pb-4 border-b border-gray-200" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          Tu Carrito de Compras
        </h1>

        {items.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm max-w-lg mx-auto">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-gray-500 mb-6 text-sm">Aún no has agregado productos a tu carrito.</p>
            <Link href="/" className="inline-block bg-black hover:bg-gray-800 text-white px-8 py-3 text-xs uppercase tracking-widest font-semibold transition-colors">
              Explorar Colección
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Columna Izquierda: Listado de Ítems */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4 sm:mb-6 pb-2 border-b border-gray-100">
                  <h2 className="text-xs uppercase tracking-wide text-gray-400 font-bold">Artículos</h2>
                  <button
                    onClick={clearCart}
                    className="text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-800 font-semibold transition-colors"
                  >
                    Vaciar
                  </button>
                </div>

                <ul className="divide-y divide-gray-100">
                  {items.map(item => {
                    const itemKey = `${item.product.id}-${buildSelectionsKey(item.selections)}`;
                    const selectionsText = formatSelections(item.selections);

                    return (
                      <li key={itemKey} className="py-6 flex gap-4 items-center first:pt-0 last:pb-0">
                        {/* Imagen del Producto */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                          {item.product.images && item.product.images[0] ? (
                            <Image
                              src={item.product.images[0]}
                              alt={item.product.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                              Sin foto
                            </div>
                          )}
                        </div>

                        {/* Detalles de Producto */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-black font-bold mb-0.5 truncate">
                            {item.product.category}
                          </p>
                          <h3 className="text-sm font-semibold text-black leading-snug truncate">
                            {item.product.name}
                          </h3>
                          {selectionsText && (
                            <p className="text-xs text-gray-400 mt-1">{selectionsText}</p>
                          )}
                          <p className="text-sm font-bold text-black mt-2" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                            ${item.product.price.toLocaleString('es-CO')}
                          </p>
                        </div>

                        {/* Modificar Cantidad & Eliminar */}
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className="flex items-center border border-gray-200 rounded">
                            <button
                              type="button"
                              onClick={() => updateQty(item.product.id, buildSelectionsKey(item.selections), item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm font-semibold"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-xs font-semibold text-black">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.product.id, buildSelectionsKey(item.selections), item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm font-semibold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id, buildSelectionsKey(item.selections))}
                            className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-black font-bold transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Columna Derecha: Formulario & Totales */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Formulario de Envío */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 md:p-8 shadow-sm">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-6 pb-2 border-b border-gray-100">
                  Datos de Envío
                </h2>

                <form id="checkout-form" onSubmit={handleBoldCheckout} className="flex flex-col gap-4">
                  {submitError && (
                    <div className="bg-gray-50 border-l-2 border-black p-3.5 text-xs text-black">
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={shippingDetails.name}
                      onChange={e => setShippingDetails({ ...shippingDetails, name: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors"
                      placeholder="Ej: Juan García"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isSubmitting}
                      value={shippingDetails.email}
                      onChange={e => setShippingDetails({ ...shippingDetails, email: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Número Celular
                    </label>
                    <input
                      type="tel"
                      required
                      disabled={isSubmitting}
                      value={shippingDetails.phone}
                      onChange={e => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors"
                      placeholder="Ej: 3004340482"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Dirección de Envío
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={shippingDetails.address}
                      onChange={e => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors"
                      placeholder="Ej: Calle 10 # 5-12, Apto 402"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Departamento
                    </label>
                    <select
                      required
                      disabled={isSubmitting}
                      value={shippingDetails.department}
                      onChange={e => setShippingDetails({ ...shippingDetails, department: e.target.value, city: '' })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors"
                    >
                      <option value="">Selecciona un departamento</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">
                      Ciudad / Municipio
                    </label>
                    <select
                      required
                      disabled={isSubmitting || !shippingDetails.department}
                      value={shippingDetails.city}
                      onChange={e => setShippingDetails({ ...shippingDetails, city: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Selecciona una ciudad</option>
                      {selectedDeptMunicipalities.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              {/* Caja de Total & CTAs */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6">
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4 pb-2 border-b border-gray-100">
                    Resumen de Compra
                  </h2>
                  <div className="flex justify-between items-baseline text-xs text-gray-500 mb-2">
                    <span>Cantidad de ítems:</span>
                    <span>{totalItems} {totalItems === 1 ? 'unidad' : 'unidades'}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-gray-500 mb-2">
                    <span>Subtotal:</span>
                    <span>${totalPrice.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-gray-500 mb-2">
                    <span className="shrink-0">Envío:</span>
                    {shippingPrice === null ? (
                      <span className="text-gray-400 italic text-right ml-2">
                        {shippingDetails.city && !shippingRates ? 'Calculando...' : 'Selecciona ciudad'}
                      </span>
                    ) : (
                      <span>${shippingPrice.toLocaleString('es-CO')}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline pt-4 border-t border-gray-150">
                    <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Total a Pagar</span>
                    <span className="text-2xl font-bold text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${grandTotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Sellos de confianza */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-100">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wide text-gray-400 leading-tight">Pago seguro<br/>Bold</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wide text-gray-400 leading-tight">Envío a toda<br/>Colombia</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wide text-gray-400 leading-tight">Soporte<br/>WhatsApp</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {submitError && (
                    <div className="bg-gray-50 border-l-2 border-black p-3.5 text-xs text-black">
                      {submitError}
                    </div>
                  )}
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isSubmitting || !boldReady}
                    className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 flex items-center justify-center gap-3 transition-all active:scale-[0.99] text-xs font-semibold uppercase tracking-[0.1em]"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>{loadingStep}</span>
                      </>
                    ) : !boldReady ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Cargando sistema de pago...</span>
                      </>
                    ) : (
                      'Pagar con Tarjeta / PSE'
                    )}
                  </button>
                  {!isSubmitting && boldReady && (
                    <p className="text-center text-[10px] text-gray-400 leading-snug break-words">
                      Pasarela segura Bold — no saldrás de la tienda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Script
        src="https://checkout.bold.co/library/boldPaymentButton.js"
        strategy="afterInteractive"
      />
    </main>
  );
}
