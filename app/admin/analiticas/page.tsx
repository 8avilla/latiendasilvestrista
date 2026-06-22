import { getDb } from '@/lib/mongodb';
import AnaliticasClient from './AnaliticasClient';

export const dynamic = 'force-dynamic';

type Periodo = 'mes' | 'mes_anterior' | '30d' | '7d' | 'total';

function getDateRange(periodo: Periodo): { start: Date | null; end: Date | null; label: string } {
  const now = new Date();
  const col = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const y = col.getUTCFullYear(), m = col.getUTCMonth(), d = col.getUTCDate();
  const tz = 5 * 60 * 60 * 1000;

  if (periodo === 'mes')
    return { start: new Date(Date.UTC(y, m, 1) + tz), end: null, label: 'Este mes' };
  if (periodo === 'mes_anterior')
    return { start: new Date(Date.UTC(y, m - 1, 1) + tz), end: new Date(Date.UTC(y, m, 1) + tz), label: 'Mes anterior' };
  if (periodo === '30d')
    return { start: new Date(Date.UTC(y, m, d - 29) + tz), end: null, label: 'Últimos 30 días' };
  if (periodo === '7d')
    return { start: new Date(Date.UTC(y, m, d - 6) + tz), end: null, label: 'Últimos 7 días' };
  return { start: null, end: null, label: 'Todo el tiempo' };
}

export default async function AnaliticasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: rawPeriodo } = await searchParams;
  const periodo = (['mes', 'mes_anterior', '30d', '7d', 'total'].includes(rawPeriodo ?? '')
    ? rawPeriodo : 'mes') as Periodo;

  const { start, end, label } = getDateRange(periodo);
  const db = await getDb();

  const dateFilter: Record<string, Date> = {};
  if (start) dateFilter.$gte = start;
  if (end) dateFilter.$lt = end;
  const matchDate = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
  const matchOrderDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const [
    uniqueSessionsAgg,
    rawCountsAgg,
    topProductsAgg,
    abandonadosAgg,
    dailyRaw,
    conversionDropAgg,
    conversionDropPrevAgg,
    revenueAgg,
    paymentErrorAgg,
    hourlyAgg,
    marginAgg,
  ] = await Promise.all([

    // Sesiones únicas por evento (eventos con sessionId)
    db.collection('analytics').aggregate([
      { $match: { ...matchDate, sessionId: { $ne: null } } },
      { $group: { _id: { event: '$event', sid: '$sessionId' } } },
      { $group: { _id: '$_id.event', uniqueSessions: { $sum: 1 } } },
    ]).toArray(),

    // Conteos brutos (fallback para eventos sin sessionId)
    db.collection('analytics').aggregate([
      { $match: matchDate },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Top productos por add_to_cart en el período
    db.collection('analytics').aggregate([
      { $match: { ...matchDate, event: 'add_to_cart', 'meta.productId': { $exists: true } } },
      { $group: {
        _id: '$meta.productId',
        productName: { $first: '$meta.productName' },
        addToCartCount: { $sum: 1 },
        price: { $first: '$meta.price' },
      }},
      { $sort: { addToCartCount: -1 } },
      { $limit: 8 },
    ]).toArray(),

    // Valor total en carritos abandonados activos
    db.collection('abandonos').aggregate([
      { $match: { converted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]).toArray(),

    // Evolución diaria últimos 30 días
    db.collection('analytics').aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-05:00' } },
          event: '$event',
        },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.date': 1 } },
    ]).toArray(),

    // Esta semana: checkout_start y order_completed (para alerta de caída)
    db.collection('analytics').aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, event: { $in: ['checkout_start', 'order_completed'] } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Semana anterior: mismo
    db.collection('analytics').aggregate([
      { $match: {
        date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        event: { $in: ['checkout_start', 'order_completed'] },
      }},
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]).toArray(),

    // Ingresos de pedidos confirmados en el período
    db.collection('orders').aggregate([
      { $match: {
        ...matchOrderDate,
        status: { $in: ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'] },
        deleted: { $ne: true },
      }},
      { $group: { _id: null, revenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
    ]).toArray(),

    // Errores de pago en el período
    db.collection('analytics').aggregate([
      { $match: { ...matchDate, event: 'payment_error' } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]).toArray(),

    // Distribución horaria de pedidos confirmados (zona Colombia UTC-5)
    db.collection('orders').aggregate([
      { $match: {
        ...matchOrderDate,
        status: { $in: ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'] },
        deleted: { $ne: true },
      }},
      { $group: {
        _id: { $hour: { date: '$createdAt', timezone: '-05:00' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]).toArray(),

    // Margen bruto: costo vs ingresos para ítems con purchaseCost registrado
    db.collection('orders').aggregate([
      { $match: {
        ...matchOrderDate,
        status: { $in: ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'] },
        deleted: { $ne: true },
      }},
      { $unwind: '$items' },
      { $match: { 'items.product.purchaseCost': { $exists: true, $gt: 0 } } },
      { $group: {
        _id: null,
        totalCost: { $sum: { $multiply: ['$items.product.purchaseCost', '$items.quantity'] } },
        revenueWithCost: { $sum: { $multiply: ['$items.product.price', '$items.quantity'] } },
      }},
    ]).toArray(),
  ]);

  // Combinar sesiones únicas con raw counts (usar sesiones donde existan, si no raw)
  const uniqueMap: Record<string, number> = Object.fromEntries(
    (uniqueSessionsAgg as { _id: string; uniqueSessions: number }[]).map(e => [e._id, e.uniqueSessions])
  );
  const rawMap: Record<string, number> = Object.fromEntries(
    (rawCountsAgg as { _id: string; count: number }[]).map(e => [e._id, e.count])
  );
  const getValue = (event: string) => uniqueMap[event] ?? rawMap[event] ?? 0;
  const hasUniqueData = Object.keys(uniqueMap).length > 0;

  const funnel = [
    { stage: 'Visitas a la tienda', event: 'pageview',       value: getValue('pageview'),       color: '#6366f1' },
    { stage: 'Vieron un producto',  event: 'product_view',   value: getValue('product_view'),   color: '#8b5cf6' },
    { stage: 'Al carrito',          event: 'add_to_cart',    value: getValue('add_to_cart'),    color: '#3b82f6' },
    { stage: 'Checkout',            event: 'checkout_start', value: getValue('checkout_start'), color: '#f59e0b' },
    { stage: 'Pagaron',             event: 'order_completed',value: getValue('order_completed'),color: '#10b981' },
  ];

  // Alerta: caída de conversión checkout→pago semana vs semana anterior
  const thisWeek = Object.fromEntries((conversionDropAgg as { _id: string; count: number }[]).map(e => [e._id, e.count]));
  const prevWeek = Object.fromEntries((conversionDropPrevAgg as { _id: string; count: number }[]).map(e => [e._id, e.count]));
  const thisConv = thisWeek['checkout_start'] > 0 ? (thisWeek['order_completed'] ?? 0) / thisWeek['checkout_start'] : null;
  const prevConv = prevWeek['checkout_start'] > 0 ? (prevWeek['order_completed'] ?? 0) / prevWeek['checkout_start'] : null;
  const convDrop = thisConv !== null && prevConv !== null && prevConv > 0
    ? Math.round(((thisConv - prevConv) / prevConv) * 100)
    : null;

  // Top productos con órdenes reales para calcular conversión carrito→compra
  const topProductIds = (topProductsAgg as { _id: string }[]).map(p => p._id);
  const orderedProductsAgg = topProductIds.length > 0
    ? await db.collection('orders').aggregate([
        { $match: { ...matchDate.date ? { createdAt: matchDate.date } : {}, deleted: { $ne: true } } },
        { $unwind: '$items' },
        { $match: { 'items.product.id': { $in: topProductIds } } },
        { $group: { _id: '$items.product.id', orderedCount: { $sum: '$items.quantity' } } },
      ]).toArray()
    : [];
  const orderedMap: Record<string, number> = Object.fromEntries(
    (orderedProductsAgg as { _id: string; orderedCount: number }[]).map(e => [e._id, e.orderedCount])
  );

  const topProducts = (topProductsAgg as {
    _id: string; productName: string; addToCartCount: number; price: number;
  }[]).map(p => ({
    productId: p._id,
    productName: p.productName as string,
    addToCartCount: p.addToCartCount,
    orderedCount: orderedMap[p._id] ?? 0,
    price: p.price as number,
  }));

  // Construir serie diaria de 30 días
  const col = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const daily30: {
    date: string; label: string;
    pageview: number; product_view: number; add_to_cart: number; checkout_start: number; order_completed: number;
  }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(col);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const lbl = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    daily30.push({ date: dateStr, label: lbl, pageview: 0, product_view: 0, add_to_cart: 0, checkout_start: 0, order_completed: 0 });
  }
  for (const row of dailyRaw) {
    const day = daily30.find(d => d.date === (row._id as Record<string, string>).date);
    if (day) {
      const ev = (row._id as Record<string, string>).event as keyof typeof day;
      if (typeof day[ev] === 'number') (day[ev] as number) = row.count as number;
    }
  }

  // Ingresos y ticket promedio
  const revenueData = (revenueAgg as { _id: null; revenue: number; count: number }[])[0];
  const revenue = revenueData?.revenue ?? 0;
  const confirmedCount = revenueData?.count ?? 0;
  const avgTicket = confirmedCount > 0 ? Math.round(revenue / confirmedCount) : 0;

  // Margen bruto
  const marginData = (marginAgg as { _id: null; totalCost: number; revenueWithCost: number }[])[0];
  const totalCost = marginData?.totalCost ?? 0;
  const revenueWithCost = marginData?.revenueWithCost ?? 0;
  const grossMargin = revenueWithCost > 0 ? revenueWithCost - totalCost : 0;
  const grossMarginPct = revenueWithCost > 0 ? Math.round((grossMargin / revenueWithCost) * 100) : null;

  // Errores de pago
  const paymentErrors = (paymentErrorAgg as { _id: null; count: number }[])[0]?.count ?? 0;
  const checkoutStarts = getValue('checkout_start');
  const paymentErrorRate = checkoutStarts > 0 ? Math.round((paymentErrors / checkoutStarts) * 100) : null;

  // Distribución horaria: array de 24 horas
  const hourlyMap: Record<number, number> = Object.fromEntries(
    (hourlyAgg as { _id: number; count: number }[]).map(e => [e._id, e.count])
  );
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h}h`,
    count: hourlyMap[h] ?? 0,
  }));

  return (
    <AnaliticasClient
      periodo={periodo}
      periodoLabel={label}
      funnel={funnel}
      daily={daily30}
      topProducts={topProducts}
      abandonadosTotal={abandonadosAgg[0]?.total ?? 0}
      abandonadosCount={abandonadosAgg[0]?.count ?? 0}
      convDrop={convDrop}
      hasUniqueData={hasUniqueData}
      revenue={revenue}
      avgTicket={avgTicket}
      confirmedCount={confirmedCount}
      paymentErrors={paymentErrors}
      paymentErrorRate={paymentErrorRate}
      hourlyData={hourlyData}
      totalCost={totalCost}
      grossMargin={grossMargin}
      grossMarginPct={grossMarginPct}
    />
  );
}
