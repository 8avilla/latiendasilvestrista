import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();

  const [pendingOrders, newOrders] = await Promise.all([
    db.collection('orders').countDocuments({
      status: { $in: ['NUEVO PEDIDO', 'PAGO PENDIENTE', 'CONFIRMADO', 'EN PREPARACIÓN'] },
      deleted: { $ne: true },
    }),
    db.collection('orders').countDocuments({
      status: 'NUEVO PEDIDO',
      deleted: { $ne: true },
    }),
  ]);

  return Response.json({ pendingOrders, newOrders });
}
