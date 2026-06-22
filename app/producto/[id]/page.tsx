import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { Product } from '@/types';
import AddToCart from './AddToCart';
import ProductGallery from './ProductGallery';
import ProductTabs from './ProductTabs';
import StickyAddToCart from './StickyAddToCart';
import ProductViewTracker from './ProductViewTracker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://latiendasilvestrista.com';

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
      : `Compra ${product.name} de La Tienda Silvestrista — $${product.price.toLocaleString('es-CO')} COP. Envíos a toda Colombia.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} — La Tienda Silvestrista`,
      description: `Compra ${product.name} por $${product.price.toLocaleString('es-CO')} COP. Envíos a toda Colombia.`,
      url,
      images: [{ url: ogImage, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — La Tienda Silvestrista`,
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
    description: product.description || `${product.name} de La Tienda Silvestrista`,
    image: product.images,
    brand: { '@type': 'Brand', name: 'La Tienda Silvestrista' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/producto/${id}`,
      seller: { '@type': 'Organization', name: 'La Tienda Silvestrista' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

            {/* Galería */}
            <ProductGallery
              images={product.images}
              name={product.name}
              freeShipping={product.freeShipping}
            />

            {/* Info */}
            <div className="flex flex-col gap-6 lg:py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-red-600 font-semibold mb-2">{product.category}</p>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-black leading-tight mb-4"
                  style={{ fontFamily: 'var(--font-dm-serif)' }}
                >
                  {product.name}
                </h1>
                <p
                  className="text-3xl font-bold text-black"
                  style={{ fontFamily: 'var(--font-dm-serif)' }}
                >
                  ${product.price.toLocaleString('es-CO')}
                  <span className="text-sm font-normal text-gray-400 ml-2">COP</span>
                </p>
              </div>

              <ProductTabs description={product.description} />

              <div id="add-to-cart-section">
                <AddToCart product={product} />
              </div>

              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  Envíos a toda Colombia
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Pago seguro con Bold
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                  Calidad garantizada
                </div>
              </div>

              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-black transition-colors underline underline-offset-2"
              >
                ← Ver toda la colección
              </Link>
            </div>
          </div>
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
