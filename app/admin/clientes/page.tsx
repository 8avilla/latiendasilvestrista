import { getDb } from '@/lib/mongodb';
import AdminBackLink from '@/components/admin/AdminBackLink';
import ClientesList from './ClientesList';

const PAID = ['CONFIRMADO', 'EN PREPARACIÓN', 'ENVIADO', 'ENTREGADO'];

export interface ClienteDoc {
  phone: string;
  name: string;
  email: string;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  firstOrderDate: string;
}

export default async function ClientesPage() {
  const db = await getDb();

  const raw = await db.collection('orders').aggregate([
    { $match: { deleted: { $ne: true } } },
    {
      $group: {
        _id: '$shippingDetails.phone',
        name:          { $last: '$shippingDetails.name' },
        email:         { $last: '$shippingDetails.email' },
        phone:         { $last: '$shippingDetails.phone' },
        orderCount:    { $sum: 1 },
        paidOrderCount:{ $sum: { $cond: [{ $in: ['$status', PAID] }, 1, 0] } },
        totalSpent:    { $sum: { $cond: [{ $in: ['$status', PAID] }, '$totalPrice', 0] } },
        lastOrderDate: { $max: '$createdAt' },
        firstOrderDate:{ $min: '$createdAt' },
      },
    },
    { $sort: { orderCount: -1 } },
  ]).toArray();

  const clientes: ClienteDoc[] = raw.map(c => ({
    phone:          c.phone ?? c._id ?? '',
    name:           c.name ?? '',
    email:          c.email ?? '',
    orderCount:     c.orderCount ?? 0,
    paidOrderCount: c.paidOrderCount ?? 0,
    totalSpent:     c.totalSpent ?? 0,
    lastOrderDate:  c.lastOrderDate ? new Date(c.lastOrderDate).toISOString() : '',
    firstOrderDate: c.firstOrderDate ? new Date(c.firstOrderDate).toISOString() : '',
  }));

  const totalClientes   = clientes.length;
  const totalFacturado  = clientes.reduce((s, c) => s + c.totalSpent, 0);
  const recurrentes     = clientes.filter(c => c.paidOrderCount > 1).length;
  const avgTicket       = totalClientes > 0 ? Math.round(totalFacturado / clientes.reduce((s, c) => s + c.paidOrderCount, 0)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-serif italic text-black">Clientes</h1>
        <p className="text-xs text-gray-400 mt-0.5">{totalClientes} clientes únicos registrados</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Clientes únicos',     value: totalClientes,                                     sub: 'con al menos 1 pedido' },
          { label: 'Clientes recurrentes',value: recurrentes,                                        sub: `${totalClientes > 0 ? Math.round((recurrentes / totalClientes) * 100) : 0}% del total` },
          { label: 'Total facturado',      value: `$${totalFacturado.toLocaleString('es-CO')}`,      sub: 'pedidos confirmados' },
          { label: 'Ticket promedio',      value: `$${avgTicket.toLocaleString('es-CO')}`,           sub: 'por pedido' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{m.label}</p>
            <p className="text-2xl font-bold text-black leading-none mt-1">{m.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <ClientesList clientes={clientes} />
    </div>
  );
}
