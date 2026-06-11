import productsData from "@/data/products.json";
import { Product } from "@/types";
import ProductGrid from "@/components/ProductGrid";

export default function Home() {
  const products = productsData as Product[];

  return (
    <main className="flex-1 w-full">
      {/* Hero */}
      <section className="bg-black text-white py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-2">
              El movimiento silvestrista
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Silvestre <span className="text-red-500">Dangond</span>
            </h1>
            <p className="mt-4 text-gray-300 text-base max-w-lg leading-relaxed">
              Viste los colores del rey del vallenato. Camisetas, gorras, sombreros, manillas
              y vasos con el sello inconfundible del movimiento silvestrista.
            </p>
            <p className="mt-6 text-sm text-gray-400">
              Elige tu producto, añádelo al carrito y coordina tu pedido directo por WhatsApp.
            </p>
          </div>

          {/* Decorative badge */}
          <div className="shrink-0 w-40 h-40 rounded-full bg-red-600 flex flex-col items-center justify-center text-center shadow-2xl border-4 border-white/10">
            <span className="text-3xl font-black text-white leading-none">SD</span>
            <span className="text-xs text-red-100 font-semibold mt-1 uppercase tracking-wider">Silvestrista</span>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">
        <ProductGrid products={products} />
      </section>
    </main>
  );
}
