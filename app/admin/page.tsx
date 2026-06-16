import { getDb } from '@/lib/mongodb';
import Link from 'next/link';
import { ClientDateTime } from '@/components/ClientDateTime';

const PAID   = ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'];
const ACTIVE = ['NUEVO PEDIDO', 'PAGO PENDIENTE', 'CONFIRMADO', 'EN PREPARACIÓN'];

const STATUS_META: Record<string, { label: string; color: string; bar: string }> = {
  'NUEVO PEDIDO':   { label: 'Nuevo pedido',   color: 'text-blue-600',   bar: 'bg-blue-400' },
  'PAGO PENDIENTE': { label: 'Pago pendiente',  color: 'text-yellow-600', bar: 'bg-yellow-400' },
  'CONFIRMADO':     { label: 'Confirmado',       color: 'text-green-600',  bar: 'bg-green-400' },
  'EN PREPARACIÓN': { label: 'En preparación',  color: 'text-orange-600', bar: 'bg-orange-400' },
  'ENVIADO':        { label: 'Enviado',          color: 'text-indigo-600', bar: 'bg-indigo-400' },
  'ENTREGADO':      { label: 'Entregado',        color: 'text-teal-600',   bar: 'bg-teal-400' },
  'CANCELADO':      { label: 'Cancelado',        color: 'text-red-500',    bar: 'bg-red-300' },
};

function colTime() {
  const now = new Date();
  const col = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const y = col.getUTCFullYear(), m = col.getUTCMonth(), d = col.getUTCDate();
  const tz = 5 * 60 * 60 * 1000;
  const startDay       = new Date(Date.UTC(y, m, d) + tz);
  const startYesterday = new Date(Date.UTC(y, m, d - 1) + tz);
  const startMonth     = new Date(Date.UTC(y, m, 1) + tz);
  const startLastMonth = new Date(Date.UTC(y, m - 1, 1) + tz);
  const start7Days     = new Date(Date.UTC(y, m, d - 6) + tz);
  return { startDay, startYesterday, startMonth, startLastMonth, start7Days, col };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] text-gray-300">sin datos previos</span>;
  const up = value >= 0;
  return (
    <span className={`text-[10px] font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}% vs mes pasado
    </span>
  );
}

async function getData() {
  const db = await getDb();
  const { startDay, startYesterday, startMonth, startLastMonth, start7Days, col } = colTime();

  const [
    todayAgg, ydayAgg, monthAgg, prevMonthAgg,
    statusAgg, dailyAgg, topProducts, recentOrders,
    channelAgg,
    stalePrepCount, stalePendingCount, newCount,
    totalProducts,
  ] = await Promise.all([
    // Ventas hoy
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startDay }, deleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
    ]).toArray(),

    // Ventas ayer
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startYesterday, $lt: startDay }, deleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
    ]).toArray(),

    // Este mes
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startMonth }, deleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 }, avg: { $avg: '$totalPrice' } } },
    ]).toArray(),

    // Mes pasado
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startLastMonth, $lt: startMonth }, deleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 }, avg: { $avg: '$totalPrice' } } },
    ]).toArray(),

    // Por estado
    db.collection('orders').aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),

    // Últimos 7 días (ventas diarias)
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: start7Days }, deleted: { $ne: true } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '-05:00' } },
        total: { $sum: '$totalPrice' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]).toArray(),

    // Top productos
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, deleted: { $ne: true } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product.name', units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.product.price', '$items.quantity'] } } } },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]).toArray(),

    // Pedidos recientes
    db.collection('orders').find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(7).toArray(),

    // Por canal
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, deleted: { $ne: true } } },
      { $group: { _id: { $ifNull: ['$salesChannel', 'Tienda Online'] }, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray(),

    // Alertas: en preparación > 48h
    db.collection('orders').countDocuments({
      status: 'EN PREPARACIÓN',
      updatedAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      deleted: { $ne: true },
    }),

    // Alertas: pago pendiente > 24h
    db.collection('orders').countDocuments({
      status: 'PAGO PENDIENTE',
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      deleted: { $ne: true },
    }),

    // Alertas: nuevos sin gestionar
    db.collection('orders').countDocuments({ status: 'NUEVO PEDIDO', deleted: { $ne: true } }),

    db.collection('products').countDocuments({ active: { $ne: false } }),
  ]);

  // Construir array de 7 días
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(col);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'UTC' });
    return { date: dateStr, label, total: 0, count: 0 };
  });
  dailyAgg.forEach(s => {
    const day = days.find(d => d.date === s._id);
    if (day) { day.total = s.total; day.count = s.count; }
  });

  const todaySales    = todayAgg[0]?.total ?? 0;
  const ydaySales     = ydayAgg[0]?.total ?? 0;
  const monthSales    = monthAgg[0]?.total ?? 0;
  const prevMonthSales = prevMonthAgg[0]?.total ?? 0;
  const monthCount    = monthAgg[0]?.count ?? 0;
  const prevMonthCount = prevMonthAgg[0]?.count ?? 0;
  const avgTicket     = monthAgg[0]?.avg ?? 0;
  const prevAvgTicket = prevMonthAgg[0]?.avg ?? 0;
  const activeOrders  = statusAgg.filter(s => ACTIVE.includes(s._id)).reduce((a, s) => a + s.count, 0);
  const maxDay        = Math.max(...days.map(d => d.total), 1);
  const totalChannel  = channelAgg.reduce((a, c) => a + c.total, 0);
  const maxStatus     = Math.max(...statusAgg.map(s => s.count), 1);

  const alerts: { level: 'warn' | 'info'; text: string }[] = [];
  if (newCount > 0)
    alerts.push({ level: 'info', text: `${newCount} pedido${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''} esperando gestión` });
  if (stalePendingCount > 0)
    alerts.push({ level: 'warn', text: `${stalePendingCount} pago${stalePendingCount > 1 ? 's' : ''} pendiente${stalePendingCount > 1 ? 's' : ''} lleva${stalePendingCount > 1 ? 'n' : ''} más de 24h sin confirmar` });
  if (stalePrepCount > 0)
    alerts.push({ level: 'warn', text: `${stalePrepCount} pedido${stalePrepCount > 1 ? 's' : ''} en preparación lleva${stalePrepCount > 1 ? 'n' : ''} más de 48h sin actualizar` });

  return {
    todaySales, ydaySales, monthSales, prevMonthSales,
    monthCount, prevMonthCount, avgTicket, prevAvgTicket,
    activeOrders, days, maxDay,
    statusAgg, maxStatus,
    topProducts, recentOrders,
    channelAgg, totalChannel,
    alerts, totalProducts,
    deltaToday: pct(todaySales, ydaySales),
    deltaMonth: pct(monthSales, prevMonthSales),
    deltaCount: pct(monthCount, prevMonthCount),
    deltaAvg:   pct(Math.round(avgTicket), Math.round(prevAvgTicket)),
  };
}

export default async function DashboardPage() {
  const d = await getData();

  const metrics = [
    { label: 'Ventas hoy',      value: `$${d.todaySales.toLocaleString('es-CO')}`,          sub: `${d.todaySales === 0 && d.ydaySales === 0 ? '—' : d.ydaySales > 0 ? `Ayer: $${d.ydaySales.toLocaleString('es-CO')}` : 'Sin ventas ayer'}`, delta: d.deltaToday, accent: 'text-red-600' },
    { label: 'Ventas del mes',  value: `$${d.monthSales.toLocaleString('es-CO')}`,          sub: `${d.monthCount} pedidos`,                delta: d.deltaMonth, accent: 'text-red-600' },
    { label: 'Pedidos activos', value: String(d.activeOrders),                               sub: 'por gestionar',                          delta: null,         accent: d.activeOrders > 0 ? 'text-orange-500' : 'text-gray-400' },
    { label: 'Ticket promedio', value: `$${Math.round(d.avgTicket).toLocaleString('es-CO')}`, sub: 'este mes',                               delta: d.deltaAvg,   accent: 'text-gray-700' },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif italic text-black">Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">{d.totalProducts} productos activos</p>
      </div>

      {/* Alertas */}
      {d.alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {d.alerts.map((alert, i) => (
            <Link key={i} href="/admin/pedidos"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 ${
                alert.level === 'warn'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
              <span className="shrink-0 text-base">{alert.level === 'warn' ? '⚠️' : 'ℹ️'}</span>
              {alert.text}
              <span className="ml-auto text-xs opacity-60">Ver pedidos →</span>
            </Link>
          ))}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{m.label}</p>
            <p className={`text-2xl font-bold leading-none ${m.accent}`}>{m.value}</p>
            <p className="text-[10px] text-gray-400">{m.sub}</p>
            <Delta value={m.delta} />
          </div>
        ))}
      </div>

      {/* Gráfica 7 días + Canal */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Gráfica */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-black">Ventas últimos 7 días</h2>
            <span className="text-xs text-gray-400">solo pedidos confirmados</span>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: '120px' }}>
            {d.days.map((day, i) => {
              const isToday = i === 6;
              const barPct  = d.maxDay > 0 ? (day.total / d.maxDay) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] text-gray-400 truncate w-full text-center h-3">
                    {day.total > 0 ? `$${Math.round(day.total / 1000)}k` : ''}
                  </span>
                  <div className="w-full flex items-end rounded-t-sm overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md ${isToday ? 'bg-red-500' : 'bg-red-200'}`}
                      style={{ height: barPct > 0 ? `${Math.max(barPct, 4)}%` : '2px', opacity: barPct === 0 ? 0.25 : 1 }}
                    />
                  </div>
                  <span className={`text-[9px] truncate capitalize ${isToday ? 'font-bold text-black' : 'text-gray-400'}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Por canal */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-black mb-4">Por canal</h2>
          {d.channelAgg.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Sin ventas registradas</p>
          ) : (
            <div className="flex flex-col gap-3">
              {d.channelAgg.map(ch => {
                const barPct = d.totalChannel > 0 ? (ch.total / d.totalChannel) * 100 : 0;
                return (
                  <div key={ch._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate">{ch._id ?? 'Tienda Online'}</span>
                      <span className="text-xs font-semibold text-black ml-2 shrink-0">{Math.round(barPct)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{ch.count} pedidos · ${ch.total.toLocaleString('es-CO')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pedidos recientes + lateral */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Pedidos recientes */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-xs text-gray-400 hover:text-black transition-colors">Ver todos →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin pedidos todavía</p>
            ) : d.recentOrders.map(order => {
              const meta = STATUS_META[order.status as string] ?? { label: order.status, color: 'text-gray-500', bar: '' };
              return (
                <div key={order._id.toString()} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{order.shippingDetails?.name ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{order.orderId}</p>
                  </div>
                  <span className={`text-[10px] font-semibold shrink-0 ${meta.color}`}>{meta.label}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-black">${(order.totalPrice as number).toLocaleString('es-CO')}</p>
                    <p className="text-[10px] text-gray-400">
                      <ClientDateTime date={order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString()} />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lateral: estados + top productos */}
        <div className="flex flex-col gap-4">

          {/* Por estado */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-black mb-3">Por estado</h2>
            <div className="flex flex-col gap-2.5">
              {d.statusAgg.map(s => {
                const meta = STATUS_META[s._id] ?? { label: s._id, color: 'text-gray-500', bar: 'bg-gray-300' };
                const barPct = Math.round((s.count / d.maxStatus) * 100);
                return (
                  <div key={s._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</span>
                      <span className="text-[11px] font-bold text-black">{s.count}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top productos */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-black">Más vendidos</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {d.topProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin ventas aún</p>
              ) : d.topProducts.map((p, i) => (
                <div key={p._id} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                  <p className="text-xs text-black flex-1 truncate">{p._id}</p>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-600">{p.units} u.</p>
                    <p className="text-[9px] text-gray-400">${p.revenue.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
