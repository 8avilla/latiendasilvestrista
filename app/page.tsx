import productsData from "@/data/products.json";
import { Product } from "@/types";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";

export default function Home() {
  const products = productsData as Product[];
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573002493031';
  const formattedNumber = whatsappNumber === '573002493031'
    ? '+57 300 249 3031'
    : `+${whatsappNumber}`;

  return (
    <main className="flex-1 w-full">
      <Hero />

      <div className="border-t border-gray-100" />

      <section id="catalogo" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
        <ProductGrid products={products} />
      </section>

      {/* Anchor de contacto — sección footer simple */}
      <section id="contacto" className="border-t border-gray-100 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black tracking-tighter text-black">SD</span>
            </div>
            <div>
              <p
                className="text-sm text-black italic"
                style={{ fontFamily: 'var(--font-dm-serif)' }}
              >
                La Tienda Silvestrista
              </p>
              <p className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">
                Silvestre Dangond
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center sm:text-right">
            Pedidos y consultas por WhatsApp&nbsp;
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 font-medium hover:underline"
            >
              {formattedNumber}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
