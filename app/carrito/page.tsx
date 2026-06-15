'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, buildSelectionsKey } from '@/components/CartProvider';
import { DEPARTMENTS } from '@/lib/colombia';
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
  const router = useRouter();

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

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(setShippingRates)
      .catch(() => {});
  }, []);

  const selectedDeptMunicipalities = DEPARTMENTS.find(d => d.name === shippingDetails.department)?.municipalities ?? [];
  const hasFreeShipping = items.some(item => item.product.freeShipping);
  const shippingPrice: number | null = (() => {
    if (hasFreeShipping) return 0;
    if (!shippingDetails.city) return null;
    if (!shippingRates) return null;
    return shippingRates.rates[shippingDetails.city] ?? shippingRates.defaultPrice;
  })();
  const grandTotal = shippingPrice !== null ? totalPrice + shippingPrice : totalPrice;

  function validateForm(): boolean {
    const form = document.getElementById('checkout-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    return true;
  }

  async function handleBoldCheckout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // 1. Validar que BoldCheckout esté cargado en el objeto global window
      const boldWindow = window as unknown as BoldWindow;
      if (!boldWindow.BoldCheckout) {
        throw new Error('El sistema de pagos de Bold.co está cargando. Por favor, espera unos segundos e intenta de nuevo.');
      }

      // 2. Crear pedido pendiente en la base de datos
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
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Error al registrar el pedido.');
      }

      const { orderId } = orderData;

      // 3. Generar la firma de integridad en el servidor (SHA-256)
      const signatureResponse = await fetch('/api/checkout/bold/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: grandTotal.toString(),
          currency: 'COP',
        }),
      });

      const signatureData = await signatureResponse.json();
      if (!signatureResponse.ok) {
        throw new Error(signatureData.error || 'Error al validar la firma de la transacción.');
      }

      const { signature } = signatureData;

      // 4. Instanciar y abrir la pasarela
      const baseOrigin = window.location.origin.includes('localhost')
        ? 'https://latiendasilvestrista.com'
        : window.location.origin.replace('http://', 'https://');

      const checkout = new boldWindow.BoldCheckout({
        apiKey: process.env.NEXT_PUBLIC_BOLD_API_KEY,
        amount: grandTotal.toString(),
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
            <Link href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-xs uppercase tracking-widest font-semibold transition-colors">
              Explorar Colección
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Columna Izquierda: Listado de Ítems */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                  <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Artículos Seleccionados</h2>
                  <button
                    onClick={clearCart}
                    className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-red-500 font-semibold transition-colors"
                  >
                    Vaciar Carrito
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
                          <p className="text-[10px] uppercase tracking-widest text-red-600 font-bold mb-0.5">
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
                            className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-red-600 font-bold transition-colors"
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
              <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-6 pb-2 border-b border-gray-100">
                  Datos de Envío
                </h2>

                <form id="checkout-form" onSubmit={handleBoldCheckout} className="flex flex-col gap-4">
                  {submitError && (
                    <div className="bg-red-50 border-l-2 border-red-600 p-3.5 text-xs text-red-700">
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors"
                      placeholder="Ej: Silvestre Dangond"
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors"
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors"
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors"
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors"
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
                      className="w-full border border-gray-200 px-3 py-2.5 text-xs text-black focus:outline-none focus:border-red-600 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
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
              <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
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
                    <span>Envío:</span>
                    {shippingPrice === null ? (
                      <span className="text-gray-400 italic">
                        {shippingDetails.city && !shippingRates ? 'Calculando...' : 'Selecciona departamento y ciudad'}
                      </span>
                    ) : shippingPrice === 0 ? (
                      <span className="text-green-600 font-semibold">Gratis</span>
                    ) : (
                      <span>${shippingPrice.toLocaleString('es-CO')}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline pt-4 border-t border-gray-150">
                    <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Total a Pagar</span>
                    <span className="text-2xl font-bold text-red-600" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${grandTotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-450 text-white py-4 flex items-center justify-center gap-3 transition-colors active:scale-[0.99] text-xs font-semibold uppercase tracking-[0.1em]"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Pagar con Tarjeta / PSE'
                    )}
                  </button>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
