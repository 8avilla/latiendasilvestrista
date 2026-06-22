import Link from 'next/link';
import { getDb } from '@/lib/mongodb';
import { CategoryDoc } from '@/types';
import CategoriasList from './CategoriasList';

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
          className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          + Nueva categoría
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="text-gray-400 text-sm">No hay categorías todavía.</p>
          <Link href="/admin/categorias/nuevo" className="mt-3 inline-block text-xs text-black underline underline-offset-2">
            Crear la primera
          </Link>
        </div>
      ) : (
        <CategoriasList initial={categories} />
      )}
    </div>
  );
}
