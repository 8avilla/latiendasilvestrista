import Link from 'next/link';
import { getDb } from '@/lib/mongodb';
import { Product, CategoryDoc } from '@/types';
import ProductsList from './ProductsList';

type AdminProduct = Product & { id: string };

async function getProducts(): Promise<AdminProduct[]> {
  const db = await getDb();
  const docs = await db.collection('products').find({}).sort({ position: 1, createdAt: -1 }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name as string,
    category: doc.category as string,
    price: doc.price as number,
    description: doc.description as string,
    images: (doc.images as string[] | undefined) ?? [],
    variantGroups: (doc.variantGroups as Product['variantGroups']) ?? [],
    active: doc.active !== false,
    soldOut: doc.soldOut === true,
    freeShipping: doc.freeShipping === true,
  }));
}

async function getCategories(): Promise<CategoryDoc[]> {
  const db = await getDb();
  const docs = await db.collection('categories').find({}).sort({ order: 1, name: 1 }).toArray();
  return docs.map(doc => ({ id: doc._id.toString(), name: doc.name as string, slug: doc.slug as string }));
}

export default async function ProductosPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif italic text-black">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="text-gray-400 text-sm">No hay productos todavía.</p>
          <Link href="/admin/productos/nuevo" className="mt-3 inline-block text-xs text-black underline underline-offset-2">
            Crear el primero
          </Link>
        </div>
      ) : (
        <ProductsList initial={products} categories={categories} />
      )}
    </div>
  );
}
