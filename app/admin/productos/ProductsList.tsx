'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CategoryDoc } from '@/types';
import DeleteButton from './DeleteButton';
import ToggleActiveButton from './ToggleActiveButton';

type AdminProduct = Product & { id: string };
type FilterStatus = 'all' | 'active' | 'inactive' | 'soldOut';

interface Props {
  initial: AdminProduct[];
  categories: CategoryDoc[];
}

export default function ProductsList({ initial, categories }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [reorderError, setReorderError] = useState('');

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Filters
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Inline price edit
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Duplicate
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const filtersActive = filterCat !== 'all' || filterStatus !== 'all';

  const filteredItems = useMemo(() => items.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (filterStatus === 'active' && !p.active) return false;
    if (filterStatus === 'inactive' && p.active !== false) return false;
    if (filterStatus === 'soldOut' && !p.soldOut) return false;
    return true;
  }), [items, filterCat, filterStatus]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────

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

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);

    setSaving(true);
    setReorderError('');
    try {
      const res = await fetch('/api/admin/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'products', ids: next.map(p => p.id) }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setReorderError('No se pudo guardar el orden');
      setItems(items);
    } finally {
      setSaving(false);
    }
  }

  // ── Inline price edit ─────────────────────────────────────────────────────

  function startPriceEdit(p: AdminProduct) {
    setEditingPriceId(p.id);
    setTempPrice(String(p.price));
  }

  async function commitPriceEdit(p: AdminProduct) {
    const newPrice = Number(tempPrice.replace(/\D/g, ''));
    setEditingPriceId(null);
    if (!newPrice || newPrice === p.price) return;

    setSavingPriceId(p.id);
    try {
      await fetch(`/api/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
      });
      setItems(prev => prev.map(item => item.id === p.id ? { ...item, price: newPrice } : item));
    } finally {
      setSavingPriceId(null);
    }
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────

  async function handleDuplicate(p: AdminProduct) {
    setDuplicatingId(p.id);
    try {
      const detailRes = await fetch(`/api/productos/${p.id}`);
      const detail = await detailRes.json();

      const { id: _id, _id: __id, createdAt, updatedAt, position, ...rest } = detail;
      void _id; void __id; void createdAt; void updatedAt; void position;

      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, name: `Copia de ${rest.name}`, active: false }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // silently ignore
    } finally {
      setDuplicatingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        {/* Categorías */}
        <div className="flex flex-wrap gap-1.5">
          {['all', ...categories.map(c => c.slug)].map(slug => {
            const label = slug === 'all' ? 'Todas' : categories.find(c => c.slug === slug)?.name ?? slug;
            const active = filterCat === slug;
            return (
              <button key={slug} onClick={() => setFilterCat(slug)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  active ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Estado */}
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive', 'soldOut'] as FilterStatus[]).map(s => {
            const labels: Record<FilterStatus, string> = { all: 'Todos', active: 'Activos', inactive: 'Ocultos', soldOut: 'Agotados' };
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filterStatus === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {saving ? 'Guardando orden...' : reorderError ? <span className="text-red-500">{reorderError}</span> : filtersActive ? `${filteredItems.length} de ${items.length} productos` : `${items.length} productos · arrastra ⠿ para reordenar`}
        </p>
        {filtersActive && (
          <button onClick={() => { setFilterCat('all'); setFilterStatus('all'); }}
            className="text-xs text-gray-400 hover:text-black underline underline-offset-2 transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1.5">
        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
            <p className="text-sm text-gray-400">Sin productos con estos filtros</p>
          </div>
        ) : filteredItems.map((p) => {
          const globalIndex = items.findIndex(item => item.id === p.id);
          const isDragging = dragging === globalIndex;
          const isDragOver = dragOver === globalIndex && dragging !== null;

          return (
            <div
              key={p.id}
              draggable={!filtersActive}
              onDragStart={() => !filtersActive && handleDragStart(globalIndex)}
              onDragEnter={() => !filtersActive && handleDragEnter(globalIndex)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => !filtersActive && handleDrop()}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              className={`bg-white rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-all select-none ${
                isDragging ? 'opacity-40 border-gray-200'
                : isDragOver ? 'border-red-400 bg-red-50/30'
                : p.active ? 'border-gray-100' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Grip */}
              <div title="Arrastrar para reordenar"
                className={`shrink-0 px-0.5 transition-colors ${filtersActive ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="7" cy="5" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="7" cy="15" r="1.5"/>
                  <circle cx="13" cy="5" r="1.5"/><circle cx="13" cy="10" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
                </svg>
              </div>

              {/* Imagen */}
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {p.images[0]
                  ? <Image src={p.images[0]} alt={p.name} fill sizes="44px" className="object-cover" />
                  : <div className="w-full h-full bg-gray-100" />}
              </div>

              {/* Nombre + categoría */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-black truncate">{p.name}</p>
                  {!p.active && <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded shrink-0">Oculto</span>}
                  {p.soldOut && <span className="text-[10px] uppercase tracking-wider text-orange-500 border border-orange-200 px-1.5 py-0.5 rounded shrink-0">Agotado</span>}
                </div>
                <p className="text-xs text-gray-400 capitalize">{p.category}</p>
              </div>

              {/* Precio inline */}
              {editingPriceId === p.id ? (
                <input
                  autoFocus
                  type="number"
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  onBlur={() => commitPriceEdit(p)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitPriceEdit(p);
                    if (e.key === 'Escape') setEditingPriceId(null);
                  }}
                  className="w-24 text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400 shrink-0"
                />
              ) : (
                <button
                  onClick={() => startPriceEdit(p)}
                  title="Clic para editar precio"
                  className={`text-sm font-semibold text-red-600 shrink-0 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors ${savingPriceId === p.id ? 'opacity-50' : ''}`}
                >
                  ${p.price.toLocaleString('es-CO')}
                </button>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                <ToggleActiveButton id={p.id} active={p.active ?? true} />

                {/* Vista previa */}
                <a href={`/producto/${p.id}`} target="_blank" rel="noopener noreferrer"
                  title="Ver en la tienda"
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                {/* Duplicar */}
                <button onClick={() => handleDuplicate(p)} disabled={duplicatingId === p.id}
                  title="Duplicar producto"
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100 disabled:opacity-40">
                  {duplicatingId === p.id
                    ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                  }
                </button>

                <Link href={`/admin/productos/${p.id}`}
                  className="text-xs border border-gray-200 hover:border-black text-gray-600 px-3 py-1.5 rounded-full transition-colors">
                  Editar
                </Link>
                <DeleteButton id={p.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
