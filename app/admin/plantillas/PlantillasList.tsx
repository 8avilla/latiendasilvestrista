'use client';

import { useState } from 'react';

interface Template {
  _id: string;
  name: string;
  body: string;
}

interface Props {
  initial: Template[];
}

function highlightVariables(text: string) {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) =>
    /^\{[^}]+\}$/.test(part) ? (
      <span key={i} className="bg-amber-100 text-amber-700 font-semibold px-1 rounded text-xs">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PlantillasList({ initial }: Props) {
  const [templates, setTemplates] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newName.trim() || !newBody.trim()) {
      setError('Nombre y cuerpo son obligatorios');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, body: newBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando plantilla');
      setTemplates(prev => [data, ...prev]);
      setNewName('');
      setNewBody('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(t: Template) {
    setEditingId(t._id);
    setEditName(t.name);
    setEditBody(t.body);
    setError('');
  }

  async function handleSaveEdit(id: string) {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plantillas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName, body: editBody }),
      });
      if (!res.ok) throw new Error('Error guardando');
      setTemplates(prev => prev.map(t => t._id === id ? { ...t, name: editName, body: editBody } : t));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await fetch(`/api/admin/plantillas?id=${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch {
      alert('Error eliminando plantilla');
    }
  }

  async function handleCopy(t: Template) {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopiedId(t._id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('No se pudo copiar al portapapeles');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Nueva plantilla button */}
      <div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); }}
          className="bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {showForm ? '✕ Cancelar' : '+ Nueva plantilla'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 max-w-xl">
          <h2 className="text-sm font-semibold text-black">Nueva plantilla</h2>
          {error && <p className="text-xs text-black bg-gray-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Nombre</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ej: Confirmación de pedido"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Mensaje</label>
            <textarea
              rows={5}
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Hola {nombre}, tu pedido {orderId} fue confirmado..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
            />
            <p className="text-[10px] text-gray-400">Variables: {'{nombre}'}, {'{orderId}'}, {'{total}'}, {'{ciudad}'}, {'{guia}'}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear plantilla'}
            </button>
          </div>
        </form>
      )}

      {/* Templates grid */}
      {templates.length === 0 && !showForm && (
        <div className="text-center py-12 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          No hay plantillas todavía. Crea la primera.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <div key={t._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            {editingId === t._id ? (
              <div className="p-4 flex flex-col gap-3 flex-1">
                {error && <p className="text-xs text-black">{error}</p>}
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
                <textarea
                  rows={6}
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black resize-none flex-1"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(t._id)}
                    disabled={saving}
                    className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:border-black transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-black truncate">{t.name}</h3>
                </div>
                <div className="px-4 py-3 flex-1">
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                    {highlightVariables(t.body)}
                  </p>
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(t)}
                    className={`flex-1 text-[10px] font-semibold uppercase tracking-wider py-1.5 rounded-lg transition-colors ${
                      copiedId === t._id
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {copiedId === t._id ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="text-[10px] font-semibold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 hover:border-black hover:text-black transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="text-[10px] font-semibold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-gray-50 transition-colors"
                  >
                    Borrar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
