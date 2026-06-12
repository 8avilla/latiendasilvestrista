import Link from 'next/link';
import Image from 'next/image';
import { getDb } from '@/lib/mongodb';
import { Product } from '@/types';
import DeleteButton from './DeleteButton';

type AdminProduct = Product & { id: string };

async function getProducts(): Promise<AdminProduct[]> {
  const db = await getDb();
  const docs = await db.collection('products').find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name as string,
    category: doc.category as string,
    price: doc.price as number,
    description: doc.description as string,
    images: (doc.images as string[] | undefined) ?? [],
    variants: doc.variants as string[] | undefined,
  }));
}

export default async function ProductosPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif italic text-black">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="text-gray-400 text-sm">No hay productos todavía.</p>
          <Link href="/admin/productos/nuevo" className="mt-3 inline-block text-xs text-red-600 underline underline-offset-2">
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {p.images[0] ? (
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">{p.name}</p>
                <p className="text-xs text-gray-400 capitalize">{p.category}</p>
              </div>

              <p className="text-sm font-semibold text-red-600 shrink-0">
                ${p.price.toLocaleString('es-CO')}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="text-xs border border-gray-200 hover:border-black text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  Editar
                </Link>
                <DeleteButton id={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
