'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import Link from 'next/link';
import Image from 'next/image';

import { Order, Product } from '@/types';
import { formatDateCO } from '@/lib/dates';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('bold-order-id');
  const boldTxStatus = searchParams.get('bold-tx-status');
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState(orderId ? '' : 'ID de pedido no especificado');
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!orderId || hasFetched.current) {
      return;
    }
    hasFetched.current = true;

    async function fetchOrder() {
      try {
        const queryParams = new URLSearchParams({ orderId: orderId! });
        if (boldTxStatus) {
          queryParams.append('bold-tx-status', boldTxStatus);
        }

        const response = await fetch(`/api/orders?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('No pudimos encontrar el pedido solicitado.');
        }
        const data = (await response.json()) as Order;
        setOrder(data);

        if (data.status === 'CONFIRMADO' || data.status === 'PAGO PENDIENTE' || data.status === 'NUEVO PEDIDO' || data.status === 'EN PREPARACIÓN' || data.status === 'ENVIADO' || data.status === 'ENTREGADO') {
          clearCart();
        }

        // Cargar productos de upsell: misma categoría, excluyendo los ya comprados
        const purchasedIds = new Set(data.items.map((i: Order['items'][0]) => i.product.id));
        const categories = [...new Set(data.items.map((i: Order['items'][0]) => i.product.category))];
        fetch('/api/productos')
          .then(r => r.json())
          .then((all: Product[]) => {
            const suggestions = all.filter(
              p => p.active !== false && !p.soldOut && !purchasedIds.has(p.id) && categories.includes(p.category)
            ).slice(0, 3);
            setUpsellProducts(suggestions.length >= 2 ? suggestions : all.filter(p => p.active !== false && !p.soldOut && !purchasedIds.has(p.id)).slice(0, 3));
          })
          .catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los detalles del pedido.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, boldTxStatus, clearCart]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4 bg-gray-50">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold animate-pulse">
          Verificando transacción...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-100 p-8 rounded-lg shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-50 text-black rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-black mb-2">Error en el pedido</h1>
          <p className="text-gray-500 text-xs mb-8">{error || 'El pedido no pudo ser cargado.'}</p>
          <Link href="/" className="inline-block w-full bg-black hover:bg-gray-800 text-white py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'CONFIRMADO' || order.status === 'EN PREPARACIÓN' || order.status === 'ENVIADO' || order.status === 'ENTREGADO';
  const isPending = order.status === 'PAGO PENDIENTE';

  return (
    <div className="flex-1 bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Status Card */}
        <div className="bg-white border border-gray-100 p-5 sm:p-8 md:p-10 rounded-xl shadow-sm text-center mb-8 relative overflow-hidden">
          {isPaid && (
            <>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-3" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                ¡Pago Confirmado!
              </h1>
              <p className="text-gray-500 text-sm max-w-lg mx-auto">
                Tu pago por **${order.totalPrice.toLocaleString('es-CO')}** ha sido procesado de forma exitosa mediante Bold.co. Estamos preparando tu envío.
              </p>
            </>
          )}

          {isPending && (
            <>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
              <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-3" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                Pago en Procesamiento
              </h1>
              <p className="text-gray-500 text-sm max-w-lg mx-auto">
                El estado de tu transacción es pendiente en la pasarela de Bold.co. Actualizaremos tu pedido en cuanto recibamos la confirmación del banco.
              </p>
            </>
          )}

          {!isPaid && !isPending && (
            <>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-black" />
              <div className="w-16 h-16 bg-gray-50 text-black rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-3" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                Transacción Rechazada
              </h1>
              <p className="text-gray-500 text-sm max-w-lg mx-auto">
                No pudimos completar el débito de los fondos. Por favor, verifica el cupo, los datos ingresados o prueba con otro medio de pago en el carrito de compras.
              </p>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-6 text-xs text-gray-400">
            <p>REFERENCIA: <span className="font-mono text-black font-semibold">{order.orderId}</span></p>
            <p>FECHA: <span className="text-black font-semibold">{formatDateCO(order.createdAt)}</span></p>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8 items-start">
          {/* Column 1: Items */}
          <div className="md:col-span-3 bg-white border border-gray-100 p-4 sm:p-6 md:p-8 rounded-xl shadow-sm">
            <h2 className="text-sm uppercase tracking-wider text-black font-bold mb-6 pb-2 border-b border-gray-100">
              Resumen del Pedido
            </h2>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item, idx) => {
                const selections = item.selections
                  ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : '';
                return (
                  <li key={idx} className="py-4 flex justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-0.5">{item.product.category}</p>
                      <p className="text-sm font-semibold text-black">{item.product.name}</p>
                      {selections && (
                        <p className="text-xs text-gray-400 mt-0.5">{selections}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{item.quantity}x ${item.product.price.toLocaleString('es-CO')}</p>
                    </div>
                    <span className="text-sm font-bold text-black self-center" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-gray-400">Total Facturado</span>
              <span className="text-2xl text-black font-bold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                ${order.totalPrice.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Column 2: Shipping Details */}
          <div className="md:col-span-2 bg-white border border-gray-100 p-4 sm:p-6 md:p-8 rounded-xl shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-black font-bold mb-4 pb-2 border-b border-gray-100">
                Información de Envío
              </h2>
              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block">Destinatario</span>
                  <span className="text-black font-medium text-sm">{order.shippingDetails.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Dirección</span>
                  <span className="text-black font-medium text-sm">{order.shippingDetails.address}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Ciudad</span>
                  <span className="text-black font-medium text-sm">
                    {order.shippingDetails.city}
                    {order.shippingDetails.department ? `, ${order.shippingDetails.department}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Celular</span>
                  <span className="text-black font-medium text-sm">{order.shippingDetails.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Email de Notificación</span>
                  <span className="text-black font-medium text-sm">{order.shippingDetails.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">

              <Link href="/" className="block w-full bg-black hover:bg-neutral-900 text-white text-center py-4 text-xs font-semibold uppercase tracking-widest transition-colors">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
        {/* Upsell */}
        {upsellProducts.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gray-200" />
              <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold shrink-0">
                Completa el look
              </h2>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {upsellProducts.map(product => (
                <Link
                  key={product.id}
                  href={`/producto/${product.id}`}
                  className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[9px] uppercase tracking-widest text-black font-semibold mb-0.5">{product.category}</p>
                    <p className="text-xs font-medium text-black leading-snug line-clamp-2">{product.name}</p>
                    <p className="text-sm font-bold text-black mt-1.5" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                      ${product.price.toLocaleString('es-CO')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center py-24 bg-gray-50">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
