'use client';

import { useState, useEffect, useMemo } from 'react';
import { DEPARTMENTS } from '@/lib/colombia';

interface ShippingRates {
  defaultPrice: number;
  rates: Record<string, number>;
}

export default function DomiciliosPage() {
  const [data, setData] = useState<ShippingRates>({ defaultPrice: 20000, rates: {} });
  const [localRates, setLocalRates] = useState<Record<string, number>>({});
  const [localDefault, setLocalDefault] = useState(20000);
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0].name);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then((d: ShippingRates) => {
        setData(d);
        setLocalDefault(d.defaultPrice ?? 20000);
        setLocalRates(d.rates ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentMunicipalities = useMemo(
    () => DEPARTMENTS.find(d => d.name === selectedDept)?.municipalities ?? [],
    [selectedDept]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return DEPARTMENTS.flatMap(d =>
      d.municipalities
        .filter(m => m.toLowerCase().includes(q))
        .map(m => ({ municipality: m, department: d.name }))
    );
  }, [search]);

  const displayList = searchResults
    ? searchResults
    : currentMunicipalities.map(m => ({ municipality: m, department: selectedDept }));

  function getPrice(municipality: string) {
    return localRates[municipality] ?? localDefault;
  }

  function setRate(municipality: string, price: number) {
    setLocalRates(prev => ({ ...prev, [municipality]: price }));
  }

  function applyDefaultToAll() {
    const reset: Record<string, number> = {};
    DEPARTMENTS.forEach(d =>
      d.municipalities.forEach(m => { reset[m] = localDefault; })
    );
    setLocalRates(reset);
  }

  function resetDept() {
    const updated = { ...localRates };
    currentMunicipalities.forEach(m => { updated[m] = localDefault; });
    setLocalRates(updated);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/shipping-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPrice: localDefault, rates: localRates }),
      });
      setData({ defaultPrice: localDefault, rates: localRates });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const unsavedChanges =
    localDefault !== data.defaultPrice ||
    JSON.stringify(localRates) !== JSON.stringify(data.rates);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-10">
        <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        Cargando tarifas...
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif italic text-black mb-1">Tarifas de Domicilio</h1>
        <p className="text-sm text-gray-500">Configura el costo de envío por municipio.</p>
      </div>

      {/* Precio por defecto */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Precio por Defecto</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-gray-400 transition-colors">
            <span className="text-sm text-gray-400 font-medium">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={localDefault}
              onChange={e => setLocalDefault(Number(e.target.value))}
              className="w-28 text-sm focus:outline-none text-black"
            />
            <span className="text-xs text-gray-400">COP</span>
          </div>
          <button
            type="button"
            onClick={applyDefaultToAll}
            className="text-xs border border-gray-200 hover:border-black text-gray-600 hover:text-black px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Aplicar a todos los municipios
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2.5">
          Aplica cuando un municipio no tiene precio personalizado.
          Actualmente guardado: <strong>${(data.defaultPrice).toLocaleString('es-CO')}</strong>.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar municipio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
        {!search && (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors text-black"
          >
            {DEPARTMENTS.map(d => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de municipios */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
            {search ? 'Resultados' : selectedDept}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">{displayList.length} municipios</span>
            {!search && (
              <button
                type="button"
                onClick={resetDept}
                className="text-[10px] text-gray-400 hover:text-black transition-colors underline"
              >
                Restablecer departamento
              </button>
            )}
          </div>
        </div>

        {displayList.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No se encontraron municipios
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
            {displayList.map(({ municipality, department }) => {
              const price = getPrice(municipality);
              const isOverridden = localRates[municipality] !== undefined && localRates[municipality] !== localDefault;
              return (
                <div key={`${department}-${municipality}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/70 transition-colors">
                  <div>
                    <p className="text-sm text-black">{municipality}</p>
                    {search && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{department}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverridden && (
                      <span className="text-[9px] uppercase tracking-wider text-red-500 font-semibold">
                        Personalizado
                      </span>
                    )}
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 focus-within:border-gray-400 transition-colors">
                      <span className="text-xs text-gray-400">$</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={price}
                        onChange={e => setRate(municipality, Number(e.target.value))}
                        className="w-20 text-sm text-right focus:outline-none text-black"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer de acciones */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !unsavedChanges}
          className="bg-black hover:bg-gray-800 disabled:opacity-40 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Guardado correctamente
          </span>
        )}
        {unsavedChanges && !saving && !saved && (
          <span className="text-xs text-amber-500 font-medium">Tienes cambios sin guardar</span>
        )}
      </div>
    </div>
  );
}
