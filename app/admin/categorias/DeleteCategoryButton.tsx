'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteCategoryButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('¿Eliminar esta categoría? Los productos que la usen no se borrarán.')) return;
    setLoading(true);
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs border border-red-200 hover:border-black text-red-500 hover:text-black px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Eliminar'}
    </button>
  );
}
