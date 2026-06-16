import { getDb } from '@/lib/mongodb';
import { Order, OrderItem, OrderStatus, SalesChannel } from '@/types';
import KanbanBoard from './KanbanBoard';
import Link from 'next/link';

async function getOrders(): Promise<Order[]> {
  const db = await getDb();
  const docs = await db.collection('orders').find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).toArray();
  return docs.map(doc => ({
    _id: doc._id.toString(),
    orderId: doc.orderId as string,
    items: doc.items as OrderItem[],
    totalPrice: doc.totalPrice as number,
    shippingPrice: (doc.shippingPrice as number) ?? 0,
    shippingDetails: {
      name: (doc.shippingDetails as any)?.name ?? '',
      address: (doc.shippingDetails as any)?.address ?? '',
      department: (doc.shippingDetails as any)?.department ?? '',
      city: (doc.shippingDetails as any)?.city ?? '',
      phone: (doc.shippingDetails as any)?.phone ?? '',
      email: (doc.shippingDetails as any)?.email ?? '',
    },
    status: doc.status as OrderStatus,
    paymentMethod: doc.paymentMethod as string,
    salesChannel: (doc.salesChannel as SalesChannel) ?? 'Tienda Online',
    notes: (doc.notes as string) ?? '',
    deleted: false,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
    transactionDetails: doc.transactionDetails as Order['transactionDetails'],
  }));
}

export default async function KanbanPage() {
  const orders = await getOrders();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif italic text-black">Tablero Kanban</h1>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} pedidos activos</p>
        </div>
        <Link href="/admin/pedidos" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black border border-gray-200 hover:border-black px-3 py-2 rounded-lg transition-all">
          &larr; Vista Lista
        </Link>
      </div>
      <KanbanBoard orders={orders} />
    </div>
  );
}
