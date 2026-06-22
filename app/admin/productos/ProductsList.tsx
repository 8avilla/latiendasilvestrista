'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CategoryDoc } from '@/types';

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

  // Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('manual');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const filtersActive = filterCat !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '' || sortBy !== 'manual' || minPrice !== '' || maxPrice !== '' || stockFilter !== 'all';

  const filteredItems = useMemo(() => {
    let result = items.filter(p => {
      // Basic
      if (filterCat !== 'all' && p.category !== filterCat) return false;
      if (filterStatus === 'active' && !p.active) return false;
      if (filterStatus === 'inactive' && p.active !== false) return false;
      if (filterStatus === 'soldOut' && !p.soldOut) return false;

      // Search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(query)) return false;
      }

      // Price Range
      const pPrice = Number(p.price);
      if (minPrice !== '' && pPrice < Number(minPrice)) return false;
      if (maxPrice !== '' && pPrice > Number(maxPrice)) return false;

      // Stock Filter
      if (stockFilter === 'tracked' && !p.stockTracked) return false;
      if (stockFilter === 'low') {
        const currentStock = p.stock ?? null;
        if (!p.stockTracked || currentStock === null || currentStock > 5) return false;
      }

      return true;
    });

    // Sort
    if (sortBy !== 'manual') {
      result = [...result].sort((a, b) => {
        if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
        if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'stock-asc') {
           const aStock = a.stockTracked ? (a.stock ?? Infinity) : Infinity;
           const bStock = b.stockTracked ? (b.stock ?? Infinity) : Infinity;
           return aStock - bStock;
        }
        return 0;
      });
    }

    return result;
  }, [items, filterCat, filterStatus, searchQuery, sortBy, minPrice, maxPrice, stockFilter]);

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Filtros */}
      <div className="flex flex-col gap-2 overflow-hidden">
        {/* Categorías */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mb-1">
          {['all', ...categories.map(c => c.slug)].map(slug => {
            const label = slug === 'all' ? 'Todas' : categories.find(c => c.slug === slug)?.name ?? slug;
            const active = filterCat === slug;
            return (
              <button key={slug} onClick={() => setFilterCat(slug)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap shrink-0 active:scale-95 ${
                  active ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Estado */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mb-1">
          {(['all', 'active', 'inactive', 'soldOut'] as FilterStatus[]).map(s => {
            const labels: Record<FilterStatus, string> = { all: 'Todos', active: 'Activos', inactive: 'Ocultos', soldOut: 'Agotados' };
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap shrink-0 active:scale-95 ${
                  filterStatus === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Avanzados */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos por nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm border rounded-xl transition-colors ${
              showAdvanced ? 'bg-gray-100 border-gray-200 text-black' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            title="Filtros avanzados"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {/* Panel de Filtros Avanzados */}
        {showAdvanced && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ordenar por */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
                >
                  <option value="manual">Manual (Drag & Drop)</option>
                  <option value="name-asc">Nombre: A - Z</option>
                  <option value="name-desc">Nombre: Z - A</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="stock-asc">Stock: Menor a Mayor</option>
                </select>
              </div>

              {/* Rango de Precio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Rango de Precio ($)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Filtro de Inventario */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Inventario</label>
                <select
                  value={stockFilter}
                  onChange={e => setStockFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
                >
                  <option value="all">Cualquiera</option>
                  <option value="tracked">Con control de stock</option>
                  <option value="low">Bajo stock (≤ 5)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">
          {saving ? 'Guardando orden...' : reorderError ? <span className="text-red-500">{reorderError}</span> : filtersActive ? <span>{filteredItems.length} de {items.length} productos <span className="text-gray-300">· limpia los filtros para reordenar</span></span> : `${items.length} productos · arrastra ⠿ para reordenar`}
        </p>
        {filtersActive && (
          <button onClick={() => {
            setFilterCat('all');
            setFilterStatus('all');
            setSearchQuery('');
            setSortBy('manual');
            setMinPrice('');
            setMaxPrice('');
            setStockFilter('all');
          }}
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
              className={`bg-white rounded-xl border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3 transition-all select-none ${
                isDragging ? 'opacity-40 border-gray-200'
                : isDragOver ? 'border-gray-400 bg-gray-50/30'
                : p.active ? 'border-gray-100' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Contenedor Superior (Imagen e Info) */}
              <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                {/* Grip */}
                <div title="Arrastrar para reordenar"
                  className={`hidden sm:block shrink-0 px-0.5 transition-colors ${filtersActive ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'}`}>
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
              </div>

              {/* Contenedor Inferior (Precio y Entrar) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                <span className="text-sm font-semibold text-gray-700 shrink-0 px-2 py-1">
                  ${p.price.toLocaleString('es-CO')}
                </span>

                <Link href={`/admin/productos/${p.id}`}
                  className="text-xs bg-black text-white hover:bg-gray-800 px-5 py-2 rounded-full transition-colors active:scale-95 font-medium shrink-0 flex items-center justify-center gap-1.5 w-full sm:w-auto">
                  Entrar
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
