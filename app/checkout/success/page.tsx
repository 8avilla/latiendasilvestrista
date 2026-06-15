'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import Link from 'next/link';

import { Order } from '@/types';
import { formatDateCO } from '@/lib/dates';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573004340482';

function buildTrackingURL(order: Order): string {
  const statusLabel: Record<string, string> = {
    'CONFIRMADO': 'Pago confirmado ✓',
    'NUEVO PEDIDO': 'Pendiente de confirmación',
    'PAGO PENDIENTE': 'Pago en procesamiento',
    'EN PREPARACIÓN': 'En preparación',
    'ENVIADO': 'Enviado 🚚',
    'ENTREGADO': 'Entregado ✓',
    'CANCELADO': 'Cancelado',
  };

  const itemLines = order.items.map(item => {
    const sel = item.selections
      ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(', ')
      : '';
    return `• ${item.quantity}x ${item.product.name}${sel ? ` (${sel})` : ''} — $${(item.product.price * item.quantity).toLocaleString('es-CO')}`;
  });

  const date = formatDateCO(order.createdAt);

  const location = [
    order.shippingDetails.city,
    order.shippingDetails.department,
  ].filter(Boolean).join(', ');

  const text = [
    '👋 Hola, quiero hacer seguimiento a mi pedido.',
    '',
    `*Referencia:* ${order.orderId}`,
    `*Estado:* ${statusLabel[order.status] ?? order.status}`,
    `*Fecha:* ${date}`,
    `*Total:* $${order.totalPrice.toLocaleString('es-CO')}`,
    '',
    '*Artículos:*',
    ...itemLines,
    '',
    '*Datos de envío:*',
    `Nombre: ${order.shippingDetails.name}`,
    `Celular: ${order.shippingDetails.phone}`,
    ...(location ? [`Ciudad: ${location}`] : []),
    `Dirección: ${order.shippingDetails.address}`,
    '',
    '¿Podrían darme una actualización? Gracias.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('bold-order-id');
  const boldTxStatus = searchParams.get('bold-tx-status');
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState(orderId ? '' : 'ID de pedido no especificado');
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

        // Si el estado es aprobado (PAGADO) o en proceso (PAGO SIN CONFIRMAR / PEDIDO SIN CONFIRMAR), vaciamos el carrito
        if (data.status === 'PAGADO' || data.status === 'PAGO SIN CONFIRMAR' || data.status === 'PEDIDO SIN CONFIRMAR' || data.status === 'ENVIADO') {
          clearCart();
        }
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
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-black mb-2">Error en el pedido</h1>
          <p className="text-gray-500 text-xs mb-8">{error || 'El pedido no pudo ser cargado.'}</p>
          <Link href="/" className="inline-block w-full bg-red-600 hover:bg-red-700 text-white py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'PAGADO' || order.status === 'ENVIADO';
  const isPending = order.status === 'PAGO SIN CONFIRMAR';
  const isWhatsApp = order.status === 'PEDIDO SIN CONFIRMAR';

  return (
    <div className="flex-1 bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Status Card */}
        <div className="bg-white border border-gray-100 p-8 md:p-10 rounded-xl shadow-sm text-center mb-8 relative overflow-hidden">
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

          {isWhatsApp && (
            <>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.023-5.115-2.887-6.979C16.586 1.9 14.112.876 11.488.875c-5.44 0-9.867 4.42-9.871 9.863-.001 1.73.46 3.42 1.334 4.927L1.93 21.892l6.332-1.66c-.001.001.001-.001.001-.001zm14.734-7.235c-.328-.164-1.937-.955-2.237-1.063-.3-.11-.52-.164-.737.164-.218.327-.84.954-1.03 1.173-.19.219-.38.246-.708.082-.328-.164-1.386-.51-2.64-1.63-1.003-.896-1.642-2.016-1.84-2.344-.197-.328-.022-.505.142-.668.148-.147.328-.382.492-.573.164-.19.219-.328.328-.546.11-.219.055-.41-.027-.573-.082-.164-.737-1.773-1.01-2.428-.266-.64-.537-.552-.737-.562-.19-.01-.41-.01-.628-.01-.218 0-.573.082-.873.41-.3.327-1.146 1.12-1.146 2.73 0 1.61 1.173 3.167 1.337 3.386.164.218 2.3 3.51 5.57 4.927.778.337 1.387.538 1.86.689.782.249 1.494.214 2.057.13.628-.094 1.937-.792 2.21-1.558.272-.765.272-1.42.19-1.557-.081-.137-.3-.219-.627-.383z"/>
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-3" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                Pedido Recibido por WhatsApp
              </h1>
              <p className="text-gray-500 text-sm max-w-lg mx-auto">
                Tu solicitud de pedido por **${order.totalPrice.toLocaleString('es-CO')}** ha sido registrada. Nuestro asesor te atenderá por WhatsApp para coordinar el pago y envío.
              </p>
            </>
          )}

          {!isPaid && !isPending && !isWhatsApp && (
            <>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600" />
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
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
        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Column 1: Items */}
          <div className="md:col-span-3 bg-white border border-gray-100 p-6 md:p-8 rounded-xl shadow-sm">
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
              <span className="text-2xl text-red-600 font-bold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                ${order.totalPrice.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* Column 2: Shipping Details */}
          <div className="md:col-span-2 bg-white border border-gray-100 p-6 md:p-8 rounded-xl shadow-sm flex flex-col gap-6">
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
              {(isPaid || isPending || isWhatsApp) && (
                <button
                  type="button"
                  onClick={() => window.open(buildTrackingURL(order), '_blank', 'noopener,noreferrer')}
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white py-4 text-xs font-semibold uppercase tracking-widest transition-colors rounded-sm"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.023-5.115-2.887-6.979C16.586 1.9 14.112.876 11.488.875c-5.44 0-9.867 4.42-9.871 9.863-.001 1.73.46 3.42 1.334 4.927L1.93 21.892l6.332-1.66c-.001.001.001-.001.001-.001zm14.734-7.235c-.328-.164-1.937-.955-2.237-1.063-.3-.11-.52-.164-.737.164-.218.327-.84.954-1.03 1.173-.19.219-.38.246-.708.082-.328-.164-1.386-.51-2.64-1.63-1.003-.896-1.642-2.016-1.84-2.344-.197-.328-.022-.505.142-.668.148-.147.328-.382.492-.573.164-.19.219-.328.328-.546.11-.219.055-.41-.027-.573-.082-.164-.737-1.773-1.01-2.428-.266-.64-.537-.552-.737-.562-.19-.01-.41-.01-.628-.01-.218 0-.573.082-.873.41-.3.327-1.146 1.12-1.146 2.73 0 1.61 1.173 3.167 1.337 3.386.164.218 2.3 3.51 5.57 4.927.778.337 1.387.538 1.86.689.782.249 1.494.214 2.057.13.628-.094 1.937-.792 2.21-1.558.272-.765.272-1.42.19-1.557-.081-.137-.3-.219-.627-.383z"/>
                  </svg>
                  Seguir pedido
                </button>
              )}
              <Link href="/" className="block w-full bg-black hover:bg-neutral-900 text-white text-center py-4 text-xs font-semibold uppercase tracking-widest transition-colors">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center py-24 bg-gray-50">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
