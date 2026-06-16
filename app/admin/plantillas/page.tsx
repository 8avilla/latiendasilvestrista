import { getDb } from '@/lib/mongodb';
import PlantillasList from './PlantillasList';

interface Template { _id: string; name: string; body: string }

export default async function PlantillasPage() {
  const db = await getDb();
  const docs = await db.collection('templates').find({}).sort({ createdAt: -1 }).toArray();
  const templates: Template[] = docs.map(d => ({ _id: d._id.toString(), name: d.name as string, body: d.body as string }));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-serif italic text-black">Plantillas WhatsApp</h1>
        <p className="text-xs text-gray-400 mt-0.5">Variables disponibles: {'{nombre}'}, {'{orderId}'}, {'{total}'}, {'{ciudad}'}, {'{guia}'}</p>
      </div>
      <PlantillasList initial={templates} />
    </div>
  );
}
