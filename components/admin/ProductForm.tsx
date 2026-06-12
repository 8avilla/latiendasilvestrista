'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CategoryDoc, VariantGroup } from '@/types';

type FormProduct = Omit<Product, 'id'>;

interface ProductFormProps {
  initial?: Partial<FormProduct & { id: string }>;
}

interface FormErrors {
  name?: string;
  category?: string;
  price?: string;
  description?: string;
  images?: string;
}

interface GroupError {
  name?: string;
  options?: string;
}

const DESC_MAX = 300;

// ── Validaciones ─────────────────────────────────────────────────────────────

function validateForm(form: FormProduct): FormErrors {
  const e: FormErrors = {};
  const name = form.name.trim();

  if (!name) {
    e.name = 'El nombre es obligatorio';
  } else if (name.length < 3) {
    e.name = 'Mínimo 3 caracteres';
  } else if (name.length > 100) {
    e.name = 'Máximo 100 caracteres';
  }

  if (!form.category) {
    e.category = 'Selecciona una categoría';
  }

  if (!form.price || form.price <= 0) {
    e.price = 'El precio debe ser mayor a $0';
  }

  if (form.description.length > DESC_MAX) {
    e.description = `Máximo ${DESC_MAX} caracteres`;
  }

  if (form.images.length === 0) {
    e.images = 'Agrega al menos una imagen';
  }

  return e;
}

function getGroupErrors(inputs: { name: string; optionsStr: string }[]): (GroupError | null)[] {
  const usedNames: Record<string, number[]> = {};
  inputs.forEach((g, i) => {
    const key = g.name.trim().toLowerCase();
    if (key) {
      if (!usedNames[key]) usedNames[key] = [];
      usedNames[key].push(i);
    }
  });

  return inputs.map((g) => {
    const err: GroupError = {};
    const trimName = g.name.trim();
    const options = parseOptions(g.optionsStr);

    if (!trimName && g.optionsStr.trim()) {
      err.name = 'Escribe un nombre para este grupo';
    }
    if (trimName && (usedNames[trimName.toLowerCase()]?.length ?? 0) > 1) {
      err.name = `Nombre duplicado — ya existe otro grupo "${trimName}"`;
    }
    if (trimName && options.length === 0) {
      err.options = 'Agrega al menos una opción';
    }
    return Object.keys(err).length ? err : null;
  });
}

function parseOptions(str: string): string[] {
  return str.split(',').map(o => o.trim()).filter(Boolean);
}

function getDuplicateOptions(str: string): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const o of parseOptions(str)) {
    const key = o.toLowerCase();
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

function inputClass(hasError: boolean) {
  return `border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors w-full ${
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-500'
      : 'border-gray-200 focus:border-red-400'
  }`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);

  useEffect(() => {
    fetch('/api/categorias').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const [form, setForm] = useState<FormProduct>({
    name: initial?.name ?? '',
    category: initial?.category ?? '',
    price: initial?.price ?? 0,
    description: initial?.description ?? '',
    images: initial?.images ?? [],
    variantGroups: initial?.variantGroups ?? [],
    active: initial?.active !== false,
  });

  const [groupInputs, setGroupInputs] = useState<{ name: string; optionsStr: string }[]>(
    () => (initial?.variantGroups ?? []).map(g => ({ name: g.name, optionsStr: g.options.join(', ') }))
  );

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const formErrors = validateForm(form);
  const groupErrors = getGroupErrors(groupInputs);
  const hasFormErrors = Object.keys(formErrors).length > 0;
  const hasGroupErrors = groupErrors.some(e => e !== null);

  function setField<K extends keyof FormProduct>(key: K, value: FormProduct[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function touch(field: string) {
    setTouched(prev => new Set([...prev, field]));
  }

  function showError(field: keyof FormErrors): boolean {
    return submitAttempted || touched.has(field);
  }

  // ── Imágenes ──────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setApiError('');
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
      setField('images', [...form.images, ...urls]);
      touch('images');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    setField('images', form.images.filter((_, i) => i !== index));
    touch('images');
  }

  function moveImage(from: number, to: number) {
    const imgs = [...form.images];
    const [item] = imgs.splice(from, 1);
    imgs.splice(to, 0, item);
    setField('images', imgs);
  }

  // ── Grupos de variantes ───────────────────────────────────────────────────
  function addGroup() {
    setGroupInputs(prev => [...prev, { name: '', optionsStr: '' }]);
  }

  function removeGroup(index: number) {
    setGroupInputs(prev => prev.filter((_, i) => i !== index));
  }

  function updateGroup(index: number, field: 'name' | 'optionsStr', value: string) {
    setGroupInputs(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  }

  function parseGroups(): VariantGroup[] {
    return groupInputs
      .filter(g => g.name.trim())
      .map(g => {
        const seen = new Set<string>();
        const options = parseOptions(g.optionsStr).filter(o => {
          const key = o.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { name: g.name.trim(), options };
      });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (hasFormErrors || hasGroupErrors) return;

    setSaving(true);
    setApiError('');
    try {
      const isEdit = !!initial?.id;
      const res = await fetch(isEdit ? `/api/productos/${initial!.id}` : '/api/productos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price), variantGroups: parseGroups() }),
      });
      if (!res.ok) throw new Error('Error guardando producto');
      router.push('/admin/productos');
      router.refresh();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error desconocido');
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 max-w-2xl">

      {apiError && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{apiError}</p>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Nombre</label>
          <span className={`text-[10px] ${form.name.length > 90 ? 'text-amber-500' : 'text-gray-300'}`}>
            {form.name.length} / 100
          </span>
        </div>
        <input
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          onBlur={() => touch('name')}
          className={inputClass(showError('name') && !!formErrors.name)}
          placeholder="Ej: Camiseta Silvestrista Clásica"
          maxLength={100}
        />
        {showError('name') && <FieldError msg={formErrors.name} />}
      </div>

      {/* Categoría + Precio */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Categoría</label>
          <select
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            onBlur={() => touch('category')}
            className={inputClass(showError('category') && !!formErrors.category).replace('px-4', 'px-3')}
          >
            <option value="">— Seleccionar —</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          {showError('category') && <FieldError msg={formErrors.category} />}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Precio (COP)</label>
          <input
            type="number"
            min={0}
            value={form.price || ''}
            onChange={e => setField('price', Number(e.target.value))}
            onBlur={() => touch('price')}
            className={inputClass(showError('price') && !!formErrors.price)}
            placeholder="55000"
          />
          {showError('price') && <FieldError msg={formErrors.price} />}
        </div>
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Descripción</label>
          <span className={`text-[10px] tabular-nums ${
            form.description.length > DESC_MAX
              ? 'text-red-500 font-semibold'
              : form.description.length > DESC_MAX * 0.85
              ? 'text-amber-500'
              : 'text-gray-300'
          }`}>
            {form.description.length} / {DESC_MAX}
          </span>
        </div>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          onBlur={() => touch('description')}
          className={`${inputClass(showError('description') && !!formErrors.description)} resize-none`}
          placeholder="Descripción corta del producto..."
        />
        {showError('description') && <FieldError msg={formErrors.description} />}
      </div>

      {/* Grupos de variantes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Variantes</label>
            {submitAttempted && hasGroupErrors && (
              <span className="text-[10px] text-red-500 font-medium">— corrige los errores</span>
            )}
          </div>
          <button type="button" onClick={addGroup}
            className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors">
            + Agregar grupo
          </button>
        </div>

        {groupInputs.length === 0 && (
          <p className="text-xs text-gray-400 italic">Sin variantes — ej. Talla, Color, Material</p>
        )}

        {groupInputs.map((g, i) => {
          const err = groupErrors[i];
          const dupes = getDuplicateOptions(g.optionsStr);
          const showGrpErr = submitAttempted || g.name.trim() !== '' || g.optionsStr.trim() !== '';
          const opts = parseOptions(g.optionsStr);

          return (
            <div key={i} className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
              showGrpErr && err ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400">Nombre del grupo</label>
                  <input
                    value={g.name}
                    onChange={e => updateGroup(i, 'name', e.target.value)}
                    placeholder="Ej: Talla, Color, Material..."
                    className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                      showGrpErr && err?.name
                        ? 'border-red-400 bg-red-50 focus:border-red-500'
                        : 'border-gray-200 focus:border-red-400'
                    }`}
                  />
                  {showGrpErr && <FieldError msg={err?.name} />}
                </div>
                <button type="button" onClick={() => removeGroup(i)}
                  className="mt-6 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title="Eliminar grupo">×</button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-400">
                  Opciones <span className="normal-case">(separadas por coma)</span>
                </label>
                <input
                  value={g.optionsStr}
                  onChange={e => updateGroup(i, 'optionsStr', e.target.value)}
                  placeholder="Ej: S, M, L, XL, XXL"
                  className={`border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                    showGrpErr && err?.options
                      ? 'border-red-400 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 focus:border-red-400'
                  }`}
                />
                {showGrpErr && <FieldError msg={err?.options} />}

                {opts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {opts.map((opt, j) => {
                      const isDupe = dupes.has(opt.toLowerCase());
                      return (
                        <span key={j} className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 ${
                          isDupe
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {opt}
                          {isDupe && <span title="Duplicada — se ignorará">⚠</span>}
                        </span>
                      );
                    })}
                    {dupes.size > 0 && (
                      <p className="w-full text-[10px] text-amber-600 mt-0.5">
                        Las opciones duplicadas se eliminarán al guardar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Imágenes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Imágenes</label>
            {form.images.length > 0 && (
              <span className="text-xs text-gray-400">La primera es la principal</span>
            )}
          </div>
          {form.images.length > 0 && (
            <span className="text-[10px] text-gray-400">{form.images.length} {form.images.length === 1 ? 'imagen' : 'imágenes'}</span>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {form.images.map((url, i) => (
            <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image src={url} alt={`imagen ${i + 1}`} fill className="object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold">
                  Principal
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {i > 0 && (
                  <button type="button" onClick={() => moveImage(i, i - 1)} title="Mover izquierda"
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors">←</button>
                )}
                {i < form.images.length - 1 && (
                  <button type="button" onClick={() => moveImage(i, i + 1)} title="Mover derecha"
                    className="w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors">→</button>
                )}
                <button type="button" onClick={() => removeImage(i)} title="Eliminar"
                  className="w-7 h-7 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors">×</button>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
              showError('images') && formErrors.images
                ? 'border-red-300 text-red-400 hover:border-red-400'
                : 'border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-400'
            }`}>
            {uploading ? <span className="text-xs">Subiendo...</span> : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] uppercase tracking-wide font-medium">Añadir</span>
              </>
            )}
          </button>
        </div>

        {showError('images') && <FieldError msg={formErrors.images} />}

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={handleFileChange} disabled={uploading} />
      </div>

      {/* Visibilidad */}
      <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium text-black">Visible en la tienda</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {form.active ? 'El producto aparece en el catálogo' : 'El producto está oculto para los clientes'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setField('active', !form.active)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            form.active ? 'bg-red-600' : 'bg-gray-200'
          }`}
          aria-label="Toggle visibilidad"
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            form.active ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving || uploading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors">
          {saving ? 'Guardando...' : initial?.id ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button type="button" onClick={() => router.push('/admin/productos')}
          className="border border-gray-200 text-gray-600 hover:border-black px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
          Cancelar
        </button>
        {submitAttempted && (hasFormErrors || hasGroupErrors) && (
          <p className="text-xs text-red-500">Revisa los campos marcados</p>
        )}
      </div>

    </form>
  );
}
