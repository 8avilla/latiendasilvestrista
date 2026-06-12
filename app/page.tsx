import { getDb } from '@/lib/mongodb';
import { Product, CategoryDoc } from '@/types';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';

export const dynamic = 'force-dynamic';

async function getProducts(): Promise<Product[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('products').find({ active: { $ne: false } }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => ({
      id: doc._id.toString(),
      name: doc.name as string,
      category: doc.category as string,
      price: doc.price as number,
      description: doc.description as string,
      images: (doc.images as string[] | undefined) ?? [],
      variantGroups: (doc.variantGroups as Product['variantGroups']) ?? [],
    }));
  } catch {
    return [];
  }
}

async function getCategories(): Promise<CategoryDoc[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('categories').find({}).sort({ order: 1, name: 1 }).toArray();
    return docs.map(doc => ({
      id: doc._id.toString(),
      name: doc.name as string,
      slug: doc.slug as string,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573004340482';

  return (
    <main className="flex-1 w-full">
      <Hero />

      <div className="border-t border-gray-100" />

      <section id="catalogo" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
        <ProductGrid products={products} categories={categories} />
      </section>

      <section id="contacto" className="border-t border-gray-100 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black tracking-tighter text-black">SD</span>
            </div>
            <div>
              <p className="text-sm text-black italic" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                La Tienda Silvestrista
              </p>
              <p className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">
                Silvestre Dangond
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <p className="text-xs text-gray-400 text-center sm:text-right">
              Pedidos y consultas por WhatsApp&nbsp;
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 font-medium hover:underline"
              >
                +57 300 434 0482
              </a>
            </p>
            <a
              href="/admin"
              className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              Administración
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
