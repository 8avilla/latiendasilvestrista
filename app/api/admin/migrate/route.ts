import { getDb } from '@/lib/mongodb';

const MIGRATIONS = [
  { from: 'PAGADO',              to: 'CONFIRMADO' },
  { from: 'PAID',                to: 'CONFIRMADO' },
  { from: 'PAGO SIN CONFIRMAR', to: 'PAGO PENDIENTE' },
  { from: 'PENDING',             to: 'PAGO PENDIENTE' },
  { from: 'PEDIDO SIN CONFIRMAR', to: 'NUEVO PEDIDO' },
  { from: 'WHATSAPP',            to: 'NUEVO PEDIDO' },
  { from: 'PEDIDO TOMADO',       to: 'EN PREPARACIÓN' },
  { from: 'FAILED',              to: 'CANCELADO' },
  { from: 'SHIPPED',             to: 'ENVIADO' },
];

export async function POST() {
  const db = await getDb();
  const results: { from: string; to: string; updated: number }[] = [];

  for (const { from, to } of MIGRATIONS) {
    const result = await db.collection('orders').updateMany(
      { status: from },
      { $set: { status: to, updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      results.push({ from, to, updated: result.modifiedCount });
    }
  }

  return Response.json({ ok: true, results, total: results.reduce((s, r) => s + r.updated, 0) });
}
