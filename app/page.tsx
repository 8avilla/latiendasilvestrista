import type { Metadata } from 'next';
import { getDb } from '@/lib/mongodb';
import { Product, CategoryDoc } from '@/types';
import Hero from '@/components/Hero';
import TrustBand from '@/components/TrustBand';
import ProductGrid from '@/components/ProductGrid';
import FAQ from '@/components/FAQ';
import SizeGuide from '@/components/SizeGuide';
import PageviewTracker from '@/components/PageviewTracker';

export const metadata: Metadata = {
  title: 'Verzus — Ropa para gente como tú',
  description: 'Verzus es una marca colombiana de ropa con diseños exclusivos. Camisetas, gorras y accesorios que dicen quién eres. Envíos a toda Colombia.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Verzus — Ropa para gente como tú',
    description: 'Marca colombiana con diseños exclusivos. Camisetas, gorras y accesorios. Envíos a toda Colombia.',
    url: '/',
  },
};

export const dynamic = 'force-dynamic';

async function getProducts(): Promise<Product[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('products').find({ active: { $ne: false } }).sort({ position: 1, createdAt: -1 }).toArray();
    return docs.map(doc => ({
      id: doc._id.toString(),
      name: doc.name as string,
      category: doc.category as string,
      price: doc.price as number,
      description: doc.description as string,
      images: (doc.images as string[] | undefined) ?? [],
      variantGroups: (doc.variantGroups as Product['variantGroups']) ?? [],
      freeShipping: doc.freeShipping === true,
      soldOut: doc.soldOut === true,
      showPopup: doc.showPopup === true,
      popupImage: (doc.popupImage as string) ?? '',
      stock: (doc.stock as number | null) ?? null,
      stockTracked: doc.stockTracked === true,
      lastUnits: doc.lastUnits === true,
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

  return (
    <main className="flex-1 w-full">
      <PageviewTracker />
      <Hero />

      <TrustBand />

      <section id="catalogo" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-16">
        <ProductGrid products={products} categories={categories} />
      </section>

      <SizeGuide />

      <FAQ />

      <section id="contacto" className="border-t border-gray-100 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black tracking-tighter text-black">VZ</span>
            </div>
            <div>
              <p className="text-sm text-black italic" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                Verzus
              </p>
              <p className="text-[10px] uppercase tracking-widest text-black font-semibold">
                Ropa para gente como tú
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">

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
