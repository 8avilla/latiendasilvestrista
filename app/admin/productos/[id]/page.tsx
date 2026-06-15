import { notFound } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import ProductForm from '@/components/admin/ProductForm';
import { Product } from '@/types';

type Props = { params: Promise<{ id: string }> };

type AdminProduct = Product & { id: string };

async function getProduct(id: string): Promise<AdminProduct | null> {
  try {
    const db = await getDb();
    const doc = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name as string,
      category: doc.category as string,
      price: doc.price as number,
      description: doc.description as string,
      images: (doc.images as string[] | undefined) ?? [],
      variantGroups: (doc.variantGroups as Product['variantGroups']) ?? [],
      active: doc.active !== false,
      freeShipping: doc.freeShipping === true,
    };
  } catch {
    return null;
  }
}

export default async function EditProductoPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-serif italic text-black mb-8">Editar producto</h1>
      <ProductForm initial={product} />
    </div>
  );
}
