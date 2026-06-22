'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/productos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={active ? 'Deshabilitar producto' : 'Habilitar producto'}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        active ? 'bg-black' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        active ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  );
}
