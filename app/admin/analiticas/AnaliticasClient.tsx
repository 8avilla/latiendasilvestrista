'use client';

import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface FunnelStage {
  stage: string;
  event: string;
  value: number;
  color: string;
}

interface DayData {
  date: string;
  label: string;
  pageview: number;
  product_view: number;
  add_to_cart: number;
  checkout_start: number;
  order_completed: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  addToCartCount: number;
  orderedCount: number;
  price: number;
}

interface HourData {
  hour: number;
  label: string;
  count: number;
}

interface Props {
  periodo: string;
  periodoLabel: string;
  funnel: FunnelStage[];
  daily: DayData[];
  topProducts: TopProduct[];
  abandonadosTotal: number;
  abandonadosCount: number;
  convDrop: number | null;
  hasUniqueData: boolean;
  revenue: number;
  avgTicket: number;
  confirmedCount: number;
  paymentErrors: number;
  paymentErrorRate: number | null;
  hourlyData: HourData[];
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number | null;
}

const PERIODOS = [
  { key: 'mes',          label: 'Este mes' },
  { key: '30d',          label: 'Últimos 30 días' },
  { key: '7d',           label: 'Últimos 7 días' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'total',        label: 'Todo' },
];

function pct(value: number, base: number): number | null {
  if (base === 0) return null;
  return Math.round((value / base) * 100);
}

export default function AnaliticasClient({
  periodo, periodoLabel, funnel, daily, topProducts,
  abandonadosTotal, abandonadosCount, convDrop, hasUniqueData,
  revenue, avgTicket, confirmedCount, paymentErrors, paymentErrorRate, hourlyData,
  totalCost, grossMargin, grossMarginPct,
}: Props) {
  const top = funnel[0].value;
  const hasData = funnel.some(s => s.value > 0);
  const lastStage = funnel[funnel.length - 1];
  const checkoutStage = funnel.find(s => s.event === 'checkout_start');

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif italic text-black">Embudo de Ventas</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Conversión de visitantes a compradores · <span className="font-medium text-gray-600">{periodoLabel}</span>
            {hasUniqueData && <span className="ml-2 text-green-600 font-medium">· sesiones únicas</span>}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PERIODOS.map(p => (
            <Link key={p.key} href={`/admin/analiticas?periodo=${p.key}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                periodo === p.key ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Alerta de caída de conversión */}
      {convDrop !== null && convDrop <= -20 && (
        <div className="bg-gray-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-red-500 text-lg leading-none mt-0.5">↓</span>
          <div>
            <p className="text-sm font-semibold text-black">Caída de conversión detectada</p>
            <p className="text-xs text-black mt-0.5">
              La tasa checkout→pago bajó <strong>{Math.abs(convDrop)}%</strong> esta semana vs la semana anterior. Revisa si hay errores de pago o fricciones en el checkout.
            </p>
          </div>
        </div>
      )}

      {/* Ingresos reales */}
      {(revenue > 0 || confirmedCount > 0) && (
        <div className={`grid gap-3 ${grossMarginPct !== null ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ingresos</p>
            <p className="text-2xl font-bold text-green-600">${revenue.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-gray-400">{confirmedCount} pedido{confirmedCount !== 1 ? 's' : ''} confirmado{confirmedCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ticket promedio</p>
            <p className="text-2xl font-bold text-black">${avgTicket.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-gray-400">por pedido confirmado</p>
          </div>
          {grossMarginPct !== null && (
            <>
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Costo mercancía</p>
                <p className="text-2xl font-bold text-orange-500">${totalCost.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-gray-400">ítems con costo registrado</p>
              </div>
              <div className="bg-white border border-emerald-100 rounded-xl px-4 py-4 flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ganancia bruta</p>
                <p className="text-2xl font-bold text-emerald-600">${grossMargin.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-gray-400">margen {grossMarginPct}%</p>
              </div>
            </>
          )}
          <div className={`bg-white border rounded-xl px-4 py-4 flex flex-col gap-1 ${
            paymentErrorRate !== null && paymentErrorRate >= 10 ? 'border-red-200' : 'border-gray-100'
          }`}>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Errores de pago</p>
            <p className={`text-2xl font-bold ${paymentErrorRate !== null && paymentErrorRate >= 10 ? 'text-black' : 'text-black'}`}>
              {paymentErrors}
            </p>
            <p className="text-[10px] text-gray-400">
              {paymentErrorRate !== null ? `${paymentErrorRate}% del checkout` : 'sin datos de checkout'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Abandono real</p>
            <p className="text-2xl font-bold text-amber-600">
              {paymentErrorRate !== null
                ? `${Math.max(0, (pct(funnel[funnel.length - 1].value, funnel.find(s => s.event === 'checkout_start')?.value ?? 0) ?? 0) - (100 - paymentErrorRate))}%`
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400">checkout sin error ni pago</p>
          </div>
        </div>
      )}

      {!hasData ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">Sin datos para este período todavía.</p>
          <p className="text-gray-300 text-xs mt-1">Los eventos se acumulan con las visitas a la tienda.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {funnel.map((s, i) => {
              const stepConv = i === 0 ? null : pct(s.value, funnel[i - 1].value);
              const totalConv = i === 0 ? null : pct(s.value, top);
              return (
                <div key={s.event} className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold leading-tight">{s.stage}</p>
                  </div>
                  <p className="text-2xl font-bold text-black leading-none">{s.value.toLocaleString('es-CO')}</p>
                  <div>
                    {stepConv !== null && (
                      <p className="text-[11px] font-semibold" style={{ color: s.color }}>{stepConv}% del paso anterior</p>
                    )}
                    {totalConv !== null && (
                      <p className="text-[10px] text-gray-400">{totalConv}% del total</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Embudo + Abandono */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Embudo visual */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-black mb-5">Embudo de Conversión</h2>
              <div className="flex flex-col gap-2.5">
                {funnel.map((s, i) => {
                  const widthPct = top > 0 ? Math.max((s.value / top) * 100, s.value > 0 ? 3 : 0) : 0;
                  const stepConv = i === 0 ? null : pct(s.value, funnel[i - 1].value);
                  const dropped = i > 0 ? funnel[i - 1].value - s.value : null;
                  return (
                    <div key={s.event}>
                      {i > 0 && dropped !== null && dropped > 0 && (
                        <div className="flex items-center gap-2 mb-1 pl-28">
                          <svg className="w-3 h-3 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px] text-gray-400">
                            {dropped.toLocaleString('es-CO')} no continuaron
                            {stepConv !== null && <span className="ml-1 text-gray-400 font-semibold">−{100 - stepConv}%</span>}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-500 w-24 shrink-0 text-right font-medium leading-tight">{s.stage}</span>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center justify-end pr-3"
                            style={{ width: `${widthPct}%`, backgroundColor: s.color }}
                          >
                            {widthPct > 18 && (
                              <span className="text-white text-xs font-bold">{s.value.toLocaleString('es-CO')}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-14 text-right shrink-0">
                          {stepConv !== null ? (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                              {stepConv}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">base</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {lastStage.value > 0 && top > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-gray-500 flex-1">
                    De cada <strong className="text-black">100 visitantes</strong>, <strong className="text-green-600">{pct(lastStage.value, top)}</strong> pagan.
                  </p>
                  <div className="flex gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600">{pct(lastStage.value, top)}%</p>
                      <p className="text-[10px] text-gray-400">Conversión total</p>
                    </div>
                    {checkoutStage && checkoutStage.value > 0 && (
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-500">{pct(lastStage.value, checkoutStage.value)}%</p>
                        <p className="text-[10px] text-gray-400">Checkout → Pago</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel de abandono */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-black">Carritos Abandonados</h2>
                {abandonadosCount > 0 ? (
                  <>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">${abandonadosTotal.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-400">en {abandonadosCount} carrito{abandonadosCount !== 1 ? 's' : ''} sin cerrar</p>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Dinero que está a un mensaje de recuperarse.
                    </p>
                    <Link href="/admin/abandonos"
                      className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-center transition-colors font-medium">
                      Ver carritos abandonados →
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Sin carritos abandonados activos.</p>
                )}
              </div>

              {/* Alerta de conversión semanal */}
              {convDrop !== null && (
                <div className={`rounded-xl p-4 border ${
                  convDrop <= -20 ? 'bg-gray-50 border-red-200' :
                  convDrop >= 10 ? 'bg-green-50 border-green-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-gray-500">Esta semana vs anterior</p>
                  <p className={`text-xl font-bold ${convDrop <= -20 ? 'text-black' : convDrop >= 10 ? 'text-green-600' : 'text-gray-700'}`}>
                    {convDrop >= 0 ? '+' : ''}{convDrop}%
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">variación en checkout→pago</p>
                </div>
              )}
            </div>
          </div>

          {/* Top productos por add_to_cart */}
          {topProducts.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-black">Productos más agregados al carrito</h2>
                <span className="text-[10px] text-gray-400">carrito → pedido confirmado</span>
              </div>
              <div className="divide-y divide-gray-50">
                {topProducts.map((p, i) => {
                  const conv = pct(p.orderedCount, p.addToCartCount);
                  return (
                    <div key={p.productId} className="px-5 py-3 flex items-center gap-3">
                      <span className="text-[11px] font-bold text-gray-300 w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black truncate">{p.productName}</p>
                        <p className="text-[10px] text-gray-400">${Number(p.price).toLocaleString('es-CO')}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-sm font-bold text-blue-600">{p.addToCartCount}</p>
                          <p className="text-[9px] text-gray-400 uppercase">al carrito</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-600">{p.orderedCount}</p>
                          <p className="text-[9px] text-gray-400 uppercase">pedidos</p>
                        </div>
                        <div className="w-12">
                          {conv !== null ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              conv >= 50 ? 'bg-green-100 text-green-700' :
                              conv >= 20 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-black'
                            }`}>{conv}%</span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">% = productos que llegaron a pedido / los que se agregaron al carrito</p>
              </div>
            </div>
          )}

          {/* Hora pico de ventas */}
          {hourlyData.some(h => h.count > 0) && (() => {
            const maxCount = Math.max(...hourlyData.map(h => h.count));
            return (
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-black">Hora pico de ventas</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Hora Colombia en que se confirman más pedidos</p>
                  </div>
                  {maxCount > 0 && (() => {
                    const peakHour = hourlyData.find(h => h.count === maxCount)!;
                    return (
                      <div className="text-right">
                        <p className="text-xl font-bold text-black">{peakHour.label}</p>
                        <p className="text-[10px] text-gray-400">{peakHour.count} pedido{peakHour.count !== 1 ? 's' : ''} — hora pico</p>
                      </div>
                    );
                  })()}
                </div>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false}
                        tick={{ fontSize: 9, fill: '#9ca3af' }} interval={2} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: 11 }}
                        formatter={(v) => [`${v ?? 0} pedidos`, 'Pedidos']}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {hourlyData.map((h) => (
                          <Cell key={h.hour} fill={h.count === maxCount ? '#10b981' : h.count >= maxCount * 0.6 ? '#6366f1' : '#e5e7eb'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* Evolución diaria */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-black mb-4">Evolución diaria (últimos 30 días)</h2>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} dy={8} interval={4} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: 12 }}
                    labelStyle={{ fontWeight: 'bold', color: '#111' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="pageview"        name="Visitas"         stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="product_view"    name="Vista producto"  stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="add_to_cart"     name="Al carrito"      stroke="#3b82f6" strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="checkout_start"  name="Checkout"        stroke="#f59e0b" strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="order_completed" name="Pagaron"         stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
