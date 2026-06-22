import { notFound } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import ProductForm from '@/components/admin/ProductForm';
import AdminBackLink from '@/components/admin/AdminBackLink';
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
      soldOut: doc.soldOut === true,
      showPopup: doc.showPopup === true,
      popupImage: (doc.popupImage as string) ?? '',
      stock: (doc.stock as number | null) ?? null,
      stockTracked: doc.stockTracked === true,
      lastUnits: doc.lastUnits === true,
      purchaseCost: (doc.purchaseCost as number | undefined) ?? undefined,
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
      <AdminBackLink href="/admin/productos" label="Volver a productos" />
      <h1 className="text-2xl font-serif italic text-black mb-8">Editar producto</h1>
      <ProductForm initial={product} />
    </div>
  );
}
