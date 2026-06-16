import { notFound } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { CategoryDoc } from '@/types';
import CategoryForm from '@/components/admin/CategoryForm';
import AdminBackLink from '@/components/admin/AdminBackLink';

type Props = { params: Promise<{ id: string }> };

async function getCategory(id: string): Promise<CategoryDoc | null> {
  try {
    const db = await getDb();
    const doc = await db.collection('categories').findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name as string,
      slug: doc.slug as string,
    };
  } catch {
    return null;
  }
}

export default async function EditCategoriaPage({ params }: Props) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <div>
      <AdminBackLink href="/admin/categorias" label="Volver a categorías" />
      <h1 className="text-2xl font-serif italic text-black mb-8">Editar categoría</h1>
      <CategoryForm initial={category} />
    </div>
  );
}
