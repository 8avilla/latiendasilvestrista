import Link from 'next/link';
import { getDb } from '@/lib/mongodb';
import { CategoryDoc } from '@/types';
import DeleteCategoryButton from './DeleteCategoryButton';

async function getCategories(): Promise<CategoryDoc[]> {
  const db = await getDb();
  const docs = await db.collection('categories').find({}).sort({ order: 1, name: 1 }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name as string,
    slug: doc.slug as string,
  }));
}

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif italic text-black">Categorías</h1>
        <Link
          href="/admin/categorias/nuevo"
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          + Nueva categoría
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="text-gray-400 text-sm">No hay categorías todavía.</p>
          <Link href="/admin/categorias/nuevo" className="mt-3 inline-block text-xs text-red-600 underline underline-offset-2">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black">{cat.name}</p>
                <p className="text-xs text-gray-400 font-mono">{cat.slug}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/categorias/${cat.id}`}
                  className="text-xs border border-gray-200 hover:border-black text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  Editar
                </Link>
                <DeleteCategoryButton id={cat.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
