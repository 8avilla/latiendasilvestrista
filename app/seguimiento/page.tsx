'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Order } from '@/types';
import { formatDateCO } from '@/lib/dates';
import { Suspense } from 'react';

const CARRIER_TRACKING_URLS: Record<string, string> = {
  'Interrapidísimo': 'https://siguetuenvio.interrapidisimo.com/',
};

function CarrierTrackingBlock({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);

  function copyTracking() {
    navigator.clipboard.writeText(order.trackingNumber!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const isInterrapidisimo = order.carrier === 'Interrapidísimo';
  const trackingUrl = order.carrier ? CARRIER_TRACKING_URLS[order.carrier] : undefined;

  return (
    <div className="mb-8 rounded-xl overflow-hidden shadow-sm border border-gray-100">
      {isInterrapidisimo ? (
        /* Header con logo real de Interrapidísimo */
        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#12121f' }}>
          <Image
            src="https://interrapidisimo.com/wp-content/uploads/logo_1_t.png"
            alt="Interrapidísimo"
            height={40}
            width={160}
            style={{ height: '40px', width: 'auto' }}
          />
          <span className="text-xs text-gray-500">Tu transportadora</span>
        </div>
      ) : (
        /* Header genérico para otras transportadoras */
        <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-800">
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1.04-.346M13 16H9m4 0h5.5M13 6h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16h-1" />
          </svg>
          <span className="text-white font-semibold text-sm">{order.carrier || 'Transportadora'}</span>
        </div>
      )}

      {/* Cuerpo: número de guía */}
      <div className="bg-white px-5 py-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Número de guía</p>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="font-mono text-lg sm:text-2xl font-bold text-black tracking-wide break-all">{order.trackingNumber}</span>
          <button
            onClick={copyTracking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              copied
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copiado
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </>
            )}
          </button>
        </div>

        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 w-full justify-center bg-black hover:bg-neutral-800 active:scale-95 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Rastrear en {order.carrier}
          </a>
        )}
      </div>
    </div>
  );
}

const STEPS: { key: string[]; label: string; sub: string }[] = [
  { key: ['NUEVO PEDIDO', 'PAGO PENDIENTE', 'CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'], label: 'Pedido recibido', sub: 'Tu pedido fue registrado' },
  { key: ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'], label: 'Pago confirmado', sub: 'El pago fue procesado' },
  { key: ['EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'], label: 'En preparación', sub: 'Estamos alistando tu pedido' },
  { key: ['ENVIADO', 'ENTREGADO'], label: 'En camino', sub: 'Tu pedido está en ruta' },
  { key: ['ENTREGADO'], label: 'Entregado', sub: 'Tu pedido llegó' },
];

function stepIndex(status: string): number {
  if (status === 'ENTREGADO') return 5;
  if (status === 'ENVIADO') return 4;
  if (status === 'EN PREPARACIÓN') return 3;
  if (status === 'CONFIRMADO') return 2;
  if (status === 'PAGO PENDIENTE' || status === 'NUEVO PEDIDO') return 1;
  return 0;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  'CONFIRMADO':     { label: 'Pago Confirmado',   color: 'text-green-700',  bg: 'bg-green-50',  bar: 'bg-green-500' },
  'EN PREPARACIÓN': { label: 'En Preparación',    color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-400' },
  'ENVIADO':        { label: 'Enviado',            color: 'text-blue-700',   bg: 'bg-blue-50',   bar: 'bg-blue-500' },
  'ENTREGADO':      { label: 'Entregado',          color: 'text-green-700',  bg: 'bg-green-50',  bar: 'bg-green-600' },
  'PAGO PENDIENTE': { label: 'Procesando Pago',   color: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-400' },
  'NUEVO PEDIDO':   { label: 'Nuevo Pedido',       color: 'text-blue-700',   bg: 'bg-blue-50',   bar: 'bg-blue-400' },
  'CANCELADO':      { label: 'Cancelado',          color: 'text-black',    bg: 'bg-gray-50',    bar: 'bg-gray-500' },
};

function TrackingView({ order }: { order: Order }) {
  const isCancelled = order.status === 'CANCELADO';
  const active = stepIndex(order.status);
  const statusMeta = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-gray-700', bg: 'bg-gray-50', bar: 'bg-gray-400' };
  const date = formatDateCO(order.createdAt);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">Seguimiento de pedido</p>
        <h1 className="text-2xl font-bold text-black font-serif mb-1">{order.orderId}</h1>
        <p className="text-xs text-gray-500">{date}</p>
      </div>

      {/* Status badge */}
      <div className={`${statusMeta.bg} rounded-xl p-4 mb-8 flex items-center gap-3`}>
        <div className={`w-2.5 h-2.5 rounded-full ${statusMeta.bar} shrink-0`} />
        <span className={`text-sm font-semibold ${statusMeta.color}`}>{statusMeta.label}</span>
      </div>

      {/* Bloque de guía de transporte — solo cuando hay número de guía */}
      {order.trackingNumber && (order.status === 'ENVIADO' || order.status === 'ENTREGADO') && (
        <CarrierTrackingBlock order={order} />
      )}

      {/* Progress steps */}
      {!isCancelled && (
        <div className="mb-8">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-100" />
            <div
              className="absolute left-4 top-5 w-0.5 bg-black transition-all duration-700"
              style={{ height: active === 0 ? 0 : active >= 3 ? '100%' : `${(active / (STEPS.length - 1)) * 100}%` }}
            />

            <div className="flex flex-col gap-0">
              {STEPS.map((step, i) => {
                const done = active > i;
                const current = active === i + 1 || (i === STEPS.length - 1 && active >= STEPS.length);
                const isActive = done || current;
                return (
                  <div key={step.label} className="relative flex items-start gap-4 pb-8 last:pb-0">
                    <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                      done ? 'bg-black border-black' : current ? 'bg-white border-black' : 'bg-white border-gray-200'
                    }`}>
                      {done ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${current ? 'bg-black' : 'bg-gray-300'}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-semibold ${isActive ? 'text-black' : 'text-gray-400'}`}>{step.label}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Productos</h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item, i) => {
            const sel = item.selections
              ? Object.entries(item.selections).map(([k, v]) => `${k}: ${v}`).join(' · ')
              : '';
            return (
              <li key={i} className="py-3 flex justify-between gap-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-black">{item.quantity}× {item.product.name}</p>
                  {sel && <p className="text-xs text-gray-400 mt-0.5">{sel}</p>}
                </div>
                <span className="text-sm font-bold text-black self-center whitespace-nowrap">
                  ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest text-gray-400">Total</span>
          <span className="text-lg font-bold text-black">${order.totalPrice.toLocaleString('es-CO')}</span>
        </div>
      </div>

      {/* Shipping details */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Dirección de envío</h2>
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="font-semibold text-black">{order.shippingDetails.name}</p>
          <p>{order.shippingDetails.address}</p>
          <p>{order.shippingDetails.city}{order.shippingDetails.department ? `, ${order.shippingDetails.department}` : ''}</p>
          <p className="text-gray-500 text-xs mt-1">{order.shippingDetails.phone}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="flex-1 bg-black hover:bg-neutral-900 text-white text-center py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors rounded-sm">
          Seguir comprando
        </Link>
        <Link href="/seguimiento" className="flex-1 border border-gray-200 hover:border-black text-black text-center py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors rounded-sm">
          Buscar otro pedido
        </Link>
      </div>
    </div>
  );
}

function SearchForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (id) router.push(`/seguimiento?id=${encodeURIComponent(id)}`);
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-black mb-2">Seguimiento de pedido</h1>
      <p className="text-sm text-gray-500 mb-8">
        Ingresa la referencia de tu pedido para ver el estado del envío.<br/>
        La encontrarás en el correo de confirmación.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ej: LTS-1234567890-1234"
          className="w-full border border-gray-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors text-center font-mono tracking-wide"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="w-full bg-black hover:bg-neutral-900 disabled:opacity-40 text-white py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors rounded-sm"
        >
          Buscar pedido
        </button>
      </form>
    </div>
  );
}

function SeguimientoContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;

    let isSubscribed = true;

    async function fetchOrder() {
      setLoading(true);
      setError('');
      setOrder(null);
      try {
        const r = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId as string)}`);
        if (!r.ok) {
          const errData = await r.json();
          throw new Error(errData.error || 'Pedido no encontrado');
        }
        const data = await r.json();
        if (isSubscribed) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : 'Error al cargar los detalles del pedido.');
          setLoading(false);
        }
      }
    }

    fetchOrder();

    return () => {
      isSubscribed = false;
    };
  }, [orderId]);

  if (!orderId) return <SearchForm />;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest text-gray-400 animate-pulse">Buscando pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-black mb-2">Pedido no encontrado</h2>
        <p className="text-sm text-gray-500 mb-6">{error || 'No encontramos un pedido con esa referencia.'}</p>
        <Link href="/seguimiento" className="inline-block bg-black hover:bg-neutral-900 text-white px-6 py-3 text-xs font-semibold uppercase tracking-widest transition-colors rounded-sm">
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  return <TrackingView order={order} />;
}

export default function SeguimientoPage() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <Suspense fallback={
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SeguimientoContent />
      </Suspense>
    </div>
  );
}
