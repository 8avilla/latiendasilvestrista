'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CategoryDoc } from '@/types';

type FormProduct = Omit<Product, 'id'>;

interface ProductFormProps {
  initial?: Partial<FormProduct & { id: string }>;
}

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);

  useEffect(() => {
    fetch('/api/categorias')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const [form, setForm] = useState<FormProduct>({
    name: initial?.name ?? '',
    category: initial?.category ?? '',
    price: initial?.price ?? 0,
    description: initial?.description ?? '',
    images: initial?.images ?? [],
    variants: initial?.variants ?? [],
  });
  const [variantInput, setVariantInput] = useState(initial?.variants?.join(', ') ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof FormProduct>(key: K, value: FormProduct[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        urls.push(data.url);
      }
      set('images', [...form.images, ...urls]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    set('images', form.images.filter((_, i) => i !== index));
  }

  function moveImage(from: number, to: number) {
    const imgs = [...form.images];
    const [item] = imgs.splice(from, 1);
    imgs.splice(to, 0, item);
    set('images', imgs);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      price: Number(form.price),
      variants: variantInput.split(',').map(v => v.trim()).filter(Boolean),
    };

    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `/api/productos/${initial!.id}` : '/api/productos';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error guardando producto');
      router.push('/admin/productos');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </p>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Nombre</label>
        <input
          required
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
          placeholder="Ej: Camiseta Silvestrista Clásica"
        />
      </div>

      {/* Categoría + Precio */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Categoría</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 bg-white"
          >
            <option value="">— Seleccionar —</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Precio (COP)</label>
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={e => set('price', Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
            placeholder="55000"
          />
        </div>
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Descripción</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none"
          placeholder="Descripción corta del producto..."
        />
      </div>

      {/* Variantes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Variantes <span className="normal-case text-gray-400">(separadas por coma)</span>
        </label>
        <input
          value={variantInput}
          onChange={e => setVariantInput(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
          placeholder="S, M, L, XL, XXL"
        />
      </div>

      {/* Imágenes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">
            Imágenes
          </label>
          {form.images.length > 0 && (
            <span className="text-xs text-gray-400">
              La primera es la imagen principal
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {form.images.map((url, i) => (
            <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image src={url} alt={`imagen ${i + 1}`} fill className="object-cover" />

              {/* Badge principal */}
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold">
                  Principal
                </span>
              )}

              {/* Overlay con acciones */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    title="Mover a la izquierda"
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors"
                  >
                    ←
                  </button>
                )}
                {i < form.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    title="Mover a la derecha"
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  title="Eliminar imagen"
                  className="w-7 h-7 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Botón añadir */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-red-400 disabled:opacity-50 flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 hover:text-red-400"
          >
            {uploading ? (
              <span className="text-xs">Subiendo...</span>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] uppercase tracking-wide font-medium">Añadir</span>
              </>
            )}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          {saving ? 'Guardando...' : initial?.id ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/productos')}
          className="border border-gray-200 text-gray-600 hover:border-black px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>

    </form>
  );
}
