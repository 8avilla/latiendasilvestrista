'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ClienteDoc } from './page';

interface Props {
  clientes: ClienteDoc[];
}

export default function ClientesList({ clientes }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'ORDERS' | 'SPENT' | 'RECENT'>('ORDERS');
  const [onlyRecurrent, setOnlyRecurrent] = useState(false);

  const filtered = useMemo(() => {
    let list = clientes;

    if (onlyRecurrent) list = list.filter(c => c.paidOrderCount > 1);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'ORDERS') return b.paidOrderCount - a.paidOrderCount;
      if (sortBy === 'SPENT')  return b.totalSpent - a.totalSpent;
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    });
  }, [clientes, search, sortBy, onlyRecurrent]);

  function formatDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
    });
  }

  const maxOrders = Math.max(...clientes.map(c => c.paidOrderCount), 1);
  const maxSpent  = Math.max(...clientes.map(c => c.totalSpent), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, celular o email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black placeholder-gray-400"
          />
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black"
        >
          <option value="ORDERS">Más pedidos</option>
          <option value="SPENT">Mayor gasto</option>
          <option value="RECENT">Más recientes</option>
        </select>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyRecurrent}
            onChange={e => setOnlyRecurrent(e.target.checked)}
            className="w-4 h-4 accent-red-600 cursor-pointer"
          />
          <span className="text-sm text-gray-600">Solo recurrentes</span>
        </label>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
          <div className="col-span-4">Cliente</div>
          <div className="col-span-2 text-center">Pedidos</div>
          <div className="col-span-2 text-right">Total gastado</div>
          <div className="col-span-2 hidden lg:block text-right">Primer pedido</div>
          <div className="col-span-2 text-right">Último pedido</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No se encontraron clientes con esos criterios
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(c => (
              <div key={c.phone} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-gray-50/50 transition-colors">
                {/* Cliente */}
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-semibold text-black truncate">{c.name || '—'}</p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    <a
                      href={`https://wa.me/57${c.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-green-600 hover:underline font-mono"
                    >
                      {c.phone}
                    </a>
                    {c.email && (
                      <span className="text-[11px] text-gray-400 truncate">{c.email}</span>
                    )}
                  </div>
                </div>

                {/* Pedidos + barra */}
                <div className="col-span-2 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.paidOrderCount > 1 ? 'bg-red-400' : 'bg-gray-300'}`}
                        style={{ width: `${(c.paidOrderCount / maxOrders) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-5 text-right shrink-0 ${c.paidOrderCount > 1 ? 'text-black' : 'text-gray-400'}`}>
                      {c.paidOrderCount}
                    </span>
                  </div>
                  {c.paidOrderCount > 1 && (
                    <span className="text-[9px] text-red-500 font-semibold uppercase tracking-wide">recurrente</span>
                  )}
                </div>

                {/* Total gastado */}
                <div className="col-span-2 text-right">
                  <p className="text-sm font-semibold text-black">${c.totalSpent.toLocaleString('es-CO')}</p>
                  <div className="flex justify-end mt-1">
                    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${(c.totalSpent / maxSpent) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primer pedido */}
                <div className="col-span-2 hidden lg:block text-right">
                  <p className="text-xs text-gray-400">{formatDate(c.firstOrderDate)}</p>
                </div>

                {/* Último pedido + acción */}
                <div className="col-span-2 text-right flex flex-col items-end gap-1.5">
                  <p className="text-xs text-gray-500">{formatDate(c.lastOrderDate)}</p>
                  <Link
                    href={`/admin/pedidos?q=${encodeURIComponent(c.phone)}`}
                    className="text-[10px] text-gray-400 hover:text-black hover:underline transition-colors"
                  >
                    Ver pedidos →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
