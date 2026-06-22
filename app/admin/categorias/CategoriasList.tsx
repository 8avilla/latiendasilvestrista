'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryDoc } from '@/types';
import DeleteCategoryButton from './DeleteCategoryButton';

export default function CategoriasList({ initial }: { initial: CategoryDoc[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function handleDragStart(i: number) {
    dragIndex.current = i;
    setDragging(i);
  }

  function handleDragEnter(i: number) {
    dragOverIndex.current = i;
    setDragOver(i);
  }

  async function handleDrop() {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragging(null);
    setDragOver(null);

    if (from === null || to === null || from === to) return;

    const next = reorder(from, to);
    setItems(next);

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'categories', ids: next.map(c => c.id) }),
      });
      if (!res.ok) throw new Error('Error guardando orden');
      router.refresh();
    } catch {
      setError('No se pudo guardar el orden');
      setItems(items);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 mb-2">
        {saving ? 'Guardando orden...' : error ? error : 'Arrastra ⠿ para reordenar'}
      </p>

      {items.map((cat, i) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragEnter={() => handleDragEnter(i)}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onDragEnd={() => { setDragging(null); setDragOver(null); }}
          className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 transition-all select-none ${
            dragging === i
              ? 'opacity-40 border-gray-200'
              : dragOver === i && dragging !== null
              ? 'border-gray-400 bg-gray-50/30'
              : 'border-gray-100'
          }`}
        >
          {/* Grip handle */}
          <div title="Arrastrar para reordenar" className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing shrink-0 transition-colors px-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="7" cy="15" r="1.5"/>
              <circle cx="13" cy="5" r="1.5"/><circle cx="13" cy="10" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black">{cat.name}</p>
            <p className="text-xs text-gray-400 font-mono">{cat.slug}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/admin/categorias/${cat.id}`}
              className="text-xs border border-gray-200 hover:border-black text-gray-600 px-3 py-1.5 rounded-full transition-colors"
            >
              Editar
            </Link>
            <DeleteCategoryButton id={cat.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
