import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { Product } from '@/types';
import ProductColorView from './ProductColorView';
import StickyAddToCart from './StickyAddToCart';
import ProductViewTracker from './ProductViewTracker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://verzus.com';

async function getProduct(id: string): Promise<Product | null> {
  try {
    if (!ObjectId.isValid(id)) return null;
    const db = await getDb();
    const doc = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name as string,
      category: doc.category as string,
      price: doc.price as number,
      description: doc.description as string,
      images: (doc.images as string[]) ?? [],
      variantGroups: (doc.variantGroups as Product['variantGroups']) ?? [],
      active: doc.active !== false,
      freeShipping: doc.freeShipping === true,
      soldOut: doc.soldOut === true,
      showPopup: doc.showPopup === true,
      popupImage: (doc.popupImage as string) ?? '',
      stock: (doc.stock as number | null) ?? null,
      stockTracked: doc.stockTracked === true,
      lastUnits: doc.lastUnits === true,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Producto no encontrado' };

  const ogImage = product.images[0] ?? `${SITE_URL}/images/hero_colombia.jpg`;
  const url = `${SITE_URL}/producto/${id}`;

  return {
    title: product.name,
    description: product.description
      ? `${product.description} — $${product.price.toLocaleString('es-CO')} COP. Envíos a toda Colombia.`
      : `Compra ${product.name} de Verzus — $${product.price.toLocaleString('es-CO')} COP. Envíos a toda Colombia.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} — Verzus`,
      description: `Compra ${product.name} por $${product.price.toLocaleString('es-CO')} COP. Envíos a toda Colombia.`,
      url,
      images: [{ url: ogImage, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — Verzus`,
      images: [ogImage],
    },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product || !product.active) notFound();

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} de Verzus`,
    image: product.images,
    brand: { '@type': 'Brand', name: 'Verzus' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/producto/${id}`,
      seller: { '@type': 'Organization', name: 'Verzus' },
    },
    ...(product.images[0] && { thumbnailUrl: product.images[0] }),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: product.category, item: `${SITE_URL}/#catalogo` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/producto/${id}` },
    ],
  };

  return (
    <>
      <ProductViewTracker productId={product.id} productName={product.name} price={product.price} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="flex-1 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/#catalogo" className="hover:text-black transition-colors capitalize">{product.category}</Link>
            <span>/</span>
            <span className="text-black truncate max-w-[200px]">{product.name}</span>
          </nav>

          <ProductColorView product={product} />
        </div>
      </main>

      <StickyAddToCart
        productName={product.name}
        price={product.price}
        soldOut={product.soldOut ?? false}
      />
    </>
  );
}
