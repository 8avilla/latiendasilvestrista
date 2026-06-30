import { Suspense } from 'react';
import { getDb } from '@/lib/mongodb';
import { Order, OrderItem, OrderStatus, SalesChannel } from '@/types';
import GestorV2 from './GestorV2';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, OrderStatus> = {
  PAID: 'CONFIRMADO',
  PAGADO: 'CONFIRMADO',
  'PEDIDO TOMADO': 'EN PREPARACIÓN',
  PENDING: 'PAGO PENDIENTE',
  'PAGO SIN CONFIRMAR': 'PAGO PENDIENTE',
};

async function getAllOrders(): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection('orders')
    .find({ deleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(doc => {
    const rawStatus = doc.status as string;
    const mappedStatus: OrderStatus = STATUS_MAP[rawStatus] ?? (rawStatus as OrderStatus);

    let mappedChannel: SalesChannel = 'Tienda Online';
    if (doc.salesChannel) {
      mappedChannel = doc.salesChannel as SalesChannel;
    } else if (doc.paymentMethod === 'WHATSAPP') {
      mappedChannel = 'Whatsapp';
    }

    const rawDetails = doc.shippingDetails as Record<string, unknown> | undefined;
    return {
      _id: doc._id.toString(),
      orderId: doc.orderId as string,
      items: (doc.items as OrderItem[]) ?? [],
      totalPrice: doc.totalPrice as number,
      shippingPrice: (doc.shippingPrice as number) ?? 0,
      shippingDetails: {
        name: (rawDetails?.name as string) ?? '',
        address: (rawDetails?.address as string) ?? '',
        department: (rawDetails?.department as string) ?? '',
        city: (rawDetails?.city as string) ?? '',
        phone: (rawDetails?.phone as string) ?? '',
        email: (rawDetails?.email as string) ?? '',
      },
      status: mappedStatus,
      paymentMethod: (doc.paymentMethod as string) ?? 'BOLD',
      salesChannel: mappedChannel,
      notes: (doc.notes as string) ?? '',
      deleted: false,
      trackingNumber: (doc.trackingNumber as string) ?? '',
      carrier: (doc.carrier as string) ?? '',
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
      transactionDetails: doc.transactionDetails as Order['transactionDetails'],
    };
  });
}

export default async function PedidosV2Page() {
  const orders = await getAllOrders();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-serif italic text-black"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            Gestor de Pedidos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Gestión completa de pedidos
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-gray-400 py-16 text-center">
            Cargando pedidos...
          </div>
        }
      >
        <GestorV2 initialOrders={orders} />
      </Suspense>
    </div>
  );
}
