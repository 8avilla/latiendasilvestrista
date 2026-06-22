import { getDb } from '@/lib/mongodb';
import Link from 'next/link';
import { ClientDateTime } from '@/components/ClientDateTime';
import DashboardCharts from './DashboardCharts';
import RefreshDashboardButton from './RefreshDashboardButton';

export const dynamic = 'force-dynamic';

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

function Delta({ value, text }: { value: number | null, text: string }) {
  if (value === null) return <span className="text-[10px] text-gray-300">sin datos previos</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold w-fit ${up ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-black'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}% <span className="font-normal opacity-70 ml-0.5">{text}</span>
    </span>
  );
}

async function getData() {
  const db = await getDb();
  const { startDay, startYesterday, startMonth, startLastMonth, start7Days, col } = colTime();

  const [
    todayAgg, ydayAgg, monthAgg, prevMonthAgg,
    statusAgg, dailyAgg, topProducts, recentOrders,
    channelAgg, geoAgg,
    stalePrepCount, stalePendingCount, newCount,
    totalProducts,
    lowStockProducts, outOfStockProducts,
    abandonedAgg, dispatchTimeAgg, staleProducts,
    profitAgg, prevProfitAgg,
    funnelAgg,
    convThisWeekAgg, convPrevWeekAgg
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

    // Geográfico (Municipios)
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, deleted: { $ne: true }, 'shippingDetails.city': { $nin: [null, ''] } } },
      { $group: { _id: '$shippingDetails.city', total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
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

    // Stock bajo (1-3 unidades)
    db.collection('products').find({
      stockTracked: true,
      stock: { $lte: 3, $gt: 0 },
      active: { $ne: false },
    }).project({ name: 1, stock: 1 }).limit(5).toArray(),

    // Sin stock
    db.collection('products').countDocuments({
      stockTracked: true,
      stock: 0,
      active: { $ne: false },
    }),

    // Dinero en la mesa (abandonos)
    db.collection('abandonos').aggregate([
      { $match: { converted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray(),

    // Tiempos de despacho (últimos 30 días)
    db.collection('orders').aggregate([
      { $match: { status: { $in: ['ENVIADO', 'ENTREGADO'] }, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, deleted: { $ne: true } } },
      { $project: { durationHours: { $divide: [{ $subtract: [{ $toDate: '$updatedAt' }, { $toDate: '$createdAt' }] }, 3600000] } } },
      { $group: { _id: null, avgHours: { $avg: '$durationHours' } } }
    ]).toArray(),

    // Productos hueso (Sin ventas en 30 días)
    (async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSoldProducts = await db.collection('orders').distinct('items.product.id', { createdAt: { $gte: thirtyDaysAgo }, status: { $in: PAID } });
      const recentSoldProductsAlt = await db.collection('orders').distinct('items.product._id', { createdAt: { $gte: thirtyDaysAgo }, status: { $in: PAID } });
      const activeSoldIds = [...new Set([...recentSoldProducts, ...recentSoldProductsAlt])];

      return db.collection('products').find({
        $and: [
          { $or: [{ id: { $nin: activeSoldIds } }, { id: { $exists: false } }] },
          { $or: [{ _id: { $nin: activeSoldIds } }, { _id: { $type: 'objectId' } }] } // Fallback
        ],
        active: { $ne: false },
        stockTracked: true,
        stock: { $gt: 0 }
      }).limit(5).toArray();
    })(),

    // Ganancia neta este mes (precio - costo de compra) * cantidad
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startMonth }, deleted: { $ne: true } } },
      { $unwind: '$items' },
      { $match: { 'items.product.purchaseCost': { $exists: true, $ne: null } } },
      { $group: {
        _id: null,
        profit: { $sum: { $multiply: [{ $subtract: ['$items.product.price', '$items.product.purchaseCost'] }, '$items.quantity'] } },
        revenue: { $sum: { $multiply: ['$items.product.price', '$items.quantity'] } },
      }},
    ]).toArray(),

    // Conversión esta semana (para alerta de caída)
    db.collection('analytics').aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, event: { $in: ['checkout_start', 'order_completed'] } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Conversión semana anterior
    db.collection('analytics').aggregate([
      { $match: {
        date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        event: { $in: ['checkout_start', 'order_completed'] },
      }},
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Embudo de conversión (mes actual)
    db.collection('analytics').aggregate([
      { $match: { date: { $gte: startMonth } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Ganancia neta mes pasado
    db.collection('orders').aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: startLastMonth, $lt: startMonth }, deleted: { $ne: true } } },
      { $unwind: '$items' },
      { $match: { 'items.product.purchaseCost': { $exists: true, $ne: null } } },
      { $group: {
        _id: null,
        profit: { $sum: { $multiply: [{ $subtract: ['$items.product.price', '$items.product.purchaseCost'] }, '$items.quantity'] } },
        revenue: { $sum: { $multiply: ['$items.product.price', '$items.quantity'] } },
      }},
    ]).toArray(),
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
  const abandonedTotal = abandonedAgg[0]?.total ?? 0;
  const dispatchAvgHours = dispatchTimeAgg[0]?.avgHours ?? 0;
  // Alerta de caída de conversión checkout→pago
  const thisWeekConv = Object.fromEntries((convThisWeekAgg as { _id: string; count: number }[]).map(e => [e._id, e.count]));
  const prevWeekConv = Object.fromEntries((convPrevWeekAgg as { _id: string; count: number }[]).map(e => [e._id, e.count]));
  const thisConvRate = (thisWeekConv['checkout_start'] ?? 0) > 0 ? (thisWeekConv['order_completed'] ?? 0) / thisWeekConv['checkout_start'] : null;
  const prevConvRate = (prevWeekConv['checkout_start'] ?? 0) > 0 ? (prevWeekConv['order_completed'] ?? 0) / prevWeekConv['checkout_start'] : null;
  const convDropPct = thisConvRate !== null && prevConvRate !== null && prevConvRate > 0
    ? Math.round(((thisConvRate - prevConvRate) / prevConvRate) * 100) : null;

  const funnelMap = Object.fromEntries((funnelAgg as { _id: string; count: number }[]).map(e => [e._id, e.count]));
  const funnelData = [
    { stage: 'Visitas', value: funnelMap['pageview'] ?? 0 },
    { stage: 'Al carrito', value: funnelMap['add_to_cart'] ?? 0 },
    { stage: 'Checkout', value: funnelMap['checkout_start'] ?? 0 },
    { stage: 'Pagaron', value: funnelMap['order_completed'] ?? 0 },
  ];

  const monthProfit   = profitAgg[0]?.profit ?? null;
  const prevMonthProfit = prevProfitAgg[0]?.profit ?? null;
  const profitRevenue = profitAgg[0]?.revenue ?? 0;
  const profitMargin  = profitRevenue > 0 && monthProfit !== null ? Math.round((monthProfit / profitRevenue) * 100) : null;

  const alerts: { level: 'warn' | 'info'; text: string; href?: string }[] = [];
  if (abandonedTotal > 0)
    alerts.push({ level: 'warn', text: `¡Dinero en la mesa! Tienes $${abandonedTotal.toLocaleString('es-CO')} estancados en carritos abandonados.`, href: '/admin/abandonos' });
  if (newCount > 0)
    alerts.push({ level: 'info', text: `${newCount} pedido${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''} esperando gestión` });
  if (stalePendingCount > 0)
    alerts.push({ level: 'warn', text: `${stalePendingCount} pago${stalePendingCount > 1 ? 's' : ''} pendiente${stalePendingCount > 1 ? 's' : ''} lleva${stalePendingCount > 1 ? 'n' : ''} más de 24h sin confirmar` });
  if (stalePrepCount > 0)
    alerts.push({ level: 'warn', text: `${stalePrepCount} pedido${stalePrepCount > 1 ? 's' : ''} en preparación lleva${stalePrepCount > 1 ? 'n' : ''} más de 48h sin actualizar` });
  if (outOfStockProducts > 0)
    alerts.push({ level: 'warn', text: `${outOfStockProducts} producto${outOfStockProducts > 1 ? 's' : ''} sin stock — revisar inventario` });
  if (convDropPct !== null && convDropPct <= -20)
    alerts.push({ level: 'warn', text: `Conversión checkout→pago cayó ${Math.abs(convDropPct)}% esta semana vs la anterior — posibles errores de pago`, href: '/admin/analiticas' });
  if (lowStockProducts.length > 0) {
    const names = lowStockProducts.map((p) => `${p.name as string} (${p.stock as number})`).join(', ');
    alerts.push({ level: 'info', text: `Stock bajo: ${names}` });
  }

  return {
    todaySales, ydaySales, monthSales, prevMonthSales,
    monthCount, prevMonthCount, avgTicket, prevAvgTicket,
    activeOrders, days, maxDay,
    statusAgg, maxStatus,
    topProducts, recentOrders,
    channelAgg, totalChannel,
    geoAgg,
    alerts, totalProducts, abandonedTotal, dispatchAvgHours, staleProducts,
    monthProfit, prevMonthProfit, profitMargin,
    funnelData,
    deltaToday: pct(todaySales, ydaySales),
    deltaMonth: pct(monthSales, prevMonthSales),
    deltaCount: pct(monthCount, prevMonthCount),
    deltaAvg:   pct(Math.round(avgTicket), Math.round(prevAvgTicket)),
    deltaProfit: monthProfit !== null && prevMonthProfit !== null ? pct(Math.round(monthProfit), Math.round(prevMonthProfit)) : null,
  };
}

export default async function DashboardPage() {
  const d = await getData();

  const metrics = [
    { label: 'Ventas hoy',      value: `$${d.todaySales.toLocaleString('es-CO')}`,          sub: `${d.todaySales === 0 && d.ydaySales === 0 ? '—' : d.ydaySales > 0 ? `Ayer: $${d.ydaySales.toLocaleString('es-CO')}` : 'Sin ventas ayer'}`, delta: d.deltaToday, deltaText: 'vs ayer', accent: 'text-black' },
    { label: 'Ventas del mes',  value: `$${d.monthSales.toLocaleString('es-CO')}`,          sub: `${d.monthCount} pedidos`,                delta: d.deltaMonth, deltaText: 'vs mes pasado', accent: 'text-black' },
    { label: 'Ganancia neta',   value: d.monthProfit !== null ? `$${Math.round(d.monthProfit).toLocaleString('es-CO')}` : '—', sub: d.profitMargin !== null ? `Margen ${d.profitMargin}% este mes` : 'Agrega costos a tus productos', delta: d.deltaProfit, deltaText: 'vs mes pasado', accent: 'text-green-600' },
    { label: 'Tiempo despacho', value: d.dispatchAvgHours > 0 ? `${Math.round(d.dispatchAvgHours)}h` : '—', sub: 'promedio (30 días)',      delta: null, deltaText: '',        accent: 'text-indigo-600' },
    { label: 'Pedidos activos', value: String(d.activeOrders),                               sub: 'por gestionar',                          delta: null, deltaText: '',        accent: d.activeOrders > 0 ? 'text-orange-500' : 'text-gray-400' },
    { label: 'Ticket promedio', value: `$${Math.round(d.avgTicket).toLocaleString('es-CO')}`, sub: 'este mes',                               delta: d.deltaAvg, deltaText: 'vs mes pasado',   accent: 'text-gray-700' },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif italic text-black">Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">{d.totalProducts} productos activos</p>
      </div>

      {/* Accesos Directos (Shortcuts) */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/pedidos/nuevo" className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <span className="text-lg leading-none">+</span>
          Crear Pedido
        </Link>
        <Link href="/admin/productos/nuevo" className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <span className="text-lg leading-none">+</span>
          Añadir Producto
        </Link>
        <RefreshDashboardButton />
        <Link href="/admin/configuracion" className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm sm:ml-auto">
          <span>⚙️</span>
          Configuración
        </Link>
      </div>



      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{m.label}</p>
            <p className={`text-2xl font-bold leading-none ${m.accent}`}>{m.value}</p>
            <p className="text-[10px] text-gray-400">{m.sub}</p>
            <Delta value={m.delta} text={m.deltaText} />
          </div>
        ))}
      </div>

      {/* Gráficos Avanzados (Recharts) */}
      <DashboardCharts
        days={d.days}
        channels={d.channelAgg as Array<{ _id: string; total: number; count: number }>}
        geo={d.geoAgg as Array<{ _id: string; total: number; count: number }>}
        funnel={d.funnelData}
      />

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
                <div key={order._id.toString()} className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0 w-full">
                    <p className="text-sm font-medium text-black truncate">{order.shippingDetails?.name ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{order.orderId}</p>
                  </div>
                  <span className={`text-[10px] font-semibold shrink-0 ${meta.color}`}>{meta.label}</span>
                  <div className="w-full sm:w-auto text-left sm:text-right shrink-0 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-50 flex sm:block justify-between items-center">
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
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-black">Más vendidos</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {d.topProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin ventas aún</p>
              ) : d.topProducts.map((p, i) => (
                <div key={p._id} className="px-4 sm:px-5 py-2.5 flex items-center gap-3">
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

          {/* Productos Hueso */}
          {d.staleProducts.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mt-4">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-black">Productos &quot;Hueso&quot;</h2>
                <span className="text-[10px] text-gray-400">+30 días sin ventas</span>
              </div>
              <div className="divide-y divide-gray-50">
                {d.staleProducts.map((p) => (
                  <div key={String(p._id)} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-black truncate max-w-[150px]">{p.name}</p>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-red-500">{p.stock} u. estancadas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
