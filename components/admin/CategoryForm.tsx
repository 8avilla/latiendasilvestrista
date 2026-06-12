'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryDoc } from '@/types';

interface CategoryFormProps {
  initial?: CategoryDoc;
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CategoryForm({ initial }: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `/api/categorias/${initial!.id}` : '/api/categorias';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, order }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error guardando categoría');
      router.push('/admin/categorias');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-md">

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Nombre
        </label>
        <input
          required
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
          placeholder="Ej: Camisetas"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Slug <span className="normal-case text-gray-400">(identificador único)</span>
        </label>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-red-400">
          <span className="px-3 py-2.5 bg-gray-50 text-xs text-gray-400 border-r border-gray-200 shrink-0">
            /categoria/
          </span>
          <input
            required
            value={slug}
            onChange={e => handleSlugChange(e.target.value)}
            className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
            placeholder="camisetas"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Orden <span className="normal-case text-gray-400">(menor número = primero)</span>
        </label>
        <input
          type="number"
          value={order}
          onChange={e => setOrder(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 w-24"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          {saving ? 'Guardando...' : initial?.id ? 'Guardar cambios' : 'Crear categoría'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/categorias')}
          className="border border-gray-200 text-gray-600 hover:border-black px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>

    </form>
  );
}
