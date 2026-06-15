'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-red-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-red-600">SD</span>
          </div>
          <span className="text-sm font-semibold tracking-wide">Admin</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/admin/productos" className="text-gray-400 hover:text-white transition-colors">
            Productos
          </Link>
          <Link href="/admin/categorias" className="text-gray-400 hover:text-white transition-colors">
            Categorías
          </Link>
          <Link href="/admin/pedidos" className="text-gray-400 hover:text-white transition-colors">
            Pedidos
          </Link>
          <Link href="/admin/domicilios" className="text-gray-400 hover:text-white transition-colors">
            Domicilios
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" target="_blank">
            Ver tienda ↗
          </Link>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-xs text-gray-400 hover:text-red-400 transition-colors"
      >
        Cerrar sesión
      </button>
    </nav>
  );
}
