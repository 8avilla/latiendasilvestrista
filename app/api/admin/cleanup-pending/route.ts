import { getDb } from '@/lib/mongodb';

// Marca como eliminados los pedidos PAGO PENDIENTE duplicados del mismo email,
// conservando solo el más reciente por email+total.
export async function POST() {
  const db = await getDb();

  const pending = await db
    .collection('orders')
    .find({ status: 'PAGO PENDIENTE', deleted: { $ne: true } })
    .sort({ createdAt: 1 })
    .toArray();

  // Agrupar por email+total
  const groups = new Map<string, typeof pending>();
  for (const order of pending) {
    const key = `${order.shippingDetails?.email ?? 'no-email'}__${order.totalPrice}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }

  let deleted = 0;
  const deleteIds: string[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    // Conservar el más reciente (último en el array ya que están ordenados por createdAt asc)
    const toDelete = group.slice(0, -1);
    for (const order of toDelete) {
      deleteIds.push(order.orderId);
    }
    deleted += toDelete.length;
  }

  if (deleteIds.length > 0) {
    await db.collection('orders').updateMany(
      { orderId: { $in: deleteIds } },
      { $set: { deleted: true, updatedAt: new Date() } }
    );
  }

  return Response.json({ reviewed: pending.length, deleted, deletedIds: deleteIds });
}
