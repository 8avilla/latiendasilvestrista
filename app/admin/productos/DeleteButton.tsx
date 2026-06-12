'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('¿Eliminar este producto?')) return;
    setLoading(true);
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs border border-red-200 hover:border-red-600 text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Eliminar'}
    </button>
  );
}
