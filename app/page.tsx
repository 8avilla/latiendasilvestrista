import productsData from "@/data/products.json";
import { Product } from "@/types";
import ProductGrid from "@/components/ProductGrid";

export default function Home() {
  const products = productsData as Product[];

  return (
    <main className="flex-1 w-full">

      {/* Hero editorial */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold mb-4">
          Colección oficial &nbsp;·&nbsp; Movimiento Silvestrista
        </p>

        <h1
          className="text-6xl sm:text-8xl lg:text-[108px] text-black leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          <span className="italic text-red-600 block text-4xl sm:text-5xl lg:text-6xl mb-1">
            La Tienda
          </span>
          Silvestrista
        </h1>

        <div className="mt-6 mb-6 flex items-center gap-4">
          <div className="h-0.5 w-16 bg-red-600" />
          <p
            className="text-xl sm:text-2xl text-black italic"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            Silvestre Dangond
          </p>
        </div>

        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Viste los colores del rey del vallenato. Elige tu producto y coordina
          tu pedido directo por WhatsApp.
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Catalog */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-12">
        <ProductGrid products={products} />
      </section>

    </main>
  );
}
