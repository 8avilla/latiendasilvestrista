import { getDb } from '@/lib/mongodb';
import AbandonosList from './AbandonosList';

export const dynamic = 'force-dynamic';

export default async function AbandonosPage() {
  const db = await getDb();
  const docs = await db.collection('abandonos').find({ converted: { $ne: true } }).sort({ updatedAt: -1 }).toArray();
  const abandonos = docs.map(d => ({
    _id: d._id.toString(),
    name: d.name as string,
    email: d.email as string,
    phone: d.phone as string,
    city: d.city as string,
    total: d.total as number,
    items: d.items as { product: { name: string; price: number }; quantity: number }[],
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : new Date(d.updatedAt).toISOString(),
  }));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-serif italic text-black">Carritos Abandonados</h1>
        <p className="text-xs text-gray-400 mt-0.5">{abandonos.length} carrito{abandonos.length !== 1 ? 's' : ''} sin completar</p>
      </div>
      <AbandonosList initial={abandonos} />
    </div>
  );
}
