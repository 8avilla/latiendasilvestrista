import { getDb } from '@/lib/mongodb';
import { Order, OrderItem, Product, OrderStatus, SalesChannel } from '@/types';
import OrdersList from './OrdersList';

async function getOrders(): Promise<Order[]> {
  const db = await getDb();
  const docs = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(doc => {
    // Mapear estados anteriores al nuevo formato
    let mappedStatus: OrderStatus = 'PAGO SIN CONFIRMAR';
    const rawStatus = doc.status as string;
    if (rawStatus === 'PAID' || rawStatus === 'PAGADO') {
      mappedStatus = 'PAGADO';
    } else if (rawStatus === 'PENDING' || rawStatus === 'PAGO SIN CONFIRMAR') {
      mappedStatus = 'PAGO SIN CONFIRMAR';
    } else if (rawStatus === 'WHATSAPP' || rawStatus === 'PEDIDO SIN CONFIRMAR') {
      mappedStatus = 'PEDIDO SIN CONFIRMAR';
    } else if (rawStatus === 'FAILED' || rawStatus === 'CANCELADO') {
      mappedStatus = 'CANCELADO';
    } else if (rawStatus === 'SHIPPED' || rawStatus === 'ENVIADO') {
      mappedStatus = 'ENVIADO';
    } else if (rawStatus === 'PEDIDO TOMADO') {
      mappedStatus = 'PEDIDO TOMADO';
    }

    // Mapear canal de venta (con fallback para históricos)
    let mappedChannel: SalesChannel = 'Tienda Online';
    if (doc.salesChannel) {
      mappedChannel = doc.salesChannel as SalesChannel;
    } else if (doc.paymentMethod === 'WHATSAPP') {
      mappedChannel = 'Whatsapp';
    }

    const rawDetails = doc.shippingDetails as any;
    const mappedShippingDetails: Order['shippingDetails'] = {
      name: (rawDetails?.name as string) ?? '',
      address: (rawDetails?.address as string) ?? '',
      department: (rawDetails?.department as string) ?? '',
      city: (rawDetails?.city as string) ?? '',
      phone: (rawDetails?.phone as string) ?? '',
      email: (rawDetails?.email as string) ?? '',
    };

    return {
      _id: doc._id.toString(),
      orderId: doc.orderId as string,
      items: (doc.items as OrderItem[]) ?? [],
      totalPrice: doc.totalPrice as number,
      shippingPrice: (doc.shippingPrice as number) ?? 0,
      shippingDetails: mappedShippingDetails,
      status: mappedStatus,
      paymentMethod: (doc.paymentMethod as string) ?? 'BOLD',
      salesChannel: mappedChannel,
      notes: (doc.notes as string) ?? '',
      deleted: doc.deleted === true,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
      transactionDetails: doc.transactionDetails as Order['transactionDetails'],
    };
  });
}

async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const docs = await db.collection('products').find({}).sort({ name: 1 }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name as string,
    category: doc.category as string,
    price: doc.price as number,
    description: (doc.description as string) ?? '',
    images: (doc.images as string[]) ?? [],
    variantGroups: doc.variantGroups as Product['variantGroups'],
    active: doc.active as boolean,
  }));
}

export default async function PedidosPage() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif italic text-black" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          Pedidos
        </h1>
        <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
          {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} registrados
        </span>
      </div>

      <OrdersList orders={orders} products={products} />
    </div>
  );
}
