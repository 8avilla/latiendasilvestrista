'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CategoryDoc, VariantGroup } from '@/types';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

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

function getGroupErrors(inputs: { name: string; optionsStr: string; imageMap: Record<string, number>; colorPick: string; customEntry: string }[]): (GroupError | null)[] {
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

const BASIC_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Única'];

const BASIC_COLORS = [
  { hex: '#000000', label: 'Negro' },
  { hex: '#FFFFFF', label: 'Blanco' },
  { hex: '#6B7280', label: 'Gris' },
  { hex: '#D1D5DB', label: 'Gris claro' },
  { hex: '#EF4444', label: 'Rojo' },
  { hex: '#F97316', label: 'Naranja' },
  { hex: '#EAB308', label: 'Amarillo' },
  { hex: '#22C55E', label: 'Verde' },
  { hex: '#14B8A6', label: 'Turquesa' },
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#1E3A8A', label: 'Azul marino' },
  { hex: '#8B5CF6', label: 'Morado' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#BE185D', label: 'Fucsia' },
  { hex: '#7F1D1D', label: 'Vino' },
  { hex: '#78350F', label: 'Café' },
  { hex: '#F5F0E8', label: 'Beige' },
  { hex: '#FCD5B0', label: 'Piel' },
];

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
      ? 'border-gray-400 bg-gray-50 focus:border-gray-1000'
      : 'border-gray-200 focus:border-gray-400'
  }`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductForm({ initial }: ProductFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const popupFileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);

  useEffect(() => {
    fetch('/api/categorias').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const [form, setForm] = useState<FormProduct>({
    name: initial?.name ?? '',
    category: initial?.category ?? '',
    price: initial?.price ?? 0,
    purchaseCost: initial?.purchaseCost ?? undefined,
    description: initial?.description ?? '',
    images: initial?.images ?? [],
    variantGroups: initial?.variantGroups ?? [],
    active: initial?.active !== false,
    freeShipping: initial?.freeShipping ?? false,
    soldOut: initial?.soldOut ?? false,
    showPopup: initial?.showPopup ?? false,
    popupImage: initial?.popupImage ?? '',
    stock: initial?.stock ?? null,
    stockTracked: initial?.stockTracked ?? false,
    lastUnits: initial?.lastUnits ?? false,
  });

  const [groupInputs, setGroupInputs] = useState<{ name: string; optionsStr: string; imageMap: Record<string, number>; colorPick: string; customEntry: string }[]>(
    () => (initial?.variantGroups ?? []).map(g => ({ name: g.name, optionsStr: g.options.join(', '), imageMap: g.imageMap ?? {}, colorPick: '#000000', customEntry: '' }))
  );

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPopup, setUploadingPopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [dragImgIndex, setDragImgIndex] = useState<number | null>(null);
  const [dragImgOver, setDragImgOver] = useState<number | null>(null);
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null);

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
        
        let data: { url?: string; error?: string } = {};
        if (res.ok) {
          data = await res.json();
          if (data.url) urls.push(data.url);
        } else {
          try {
            data = await res.json();
          } catch {}
          throw new Error(data.error || 'Error subiendo imagen (servidor respondió con error)');
        }
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

  async function removeImage(index: number) {
    const result = await Swal.fire({
      title: '¿Eliminar imagen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    setField('images', form.images.filter((_, i) => i !== index));
    touch('images');
  }

  async function rotateImage(index: number, direction: 'left' | 'right') {
    setRotatingIndex(index);
    try {
      const res = await fetch('/api/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.images[index], direction }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error rotando imagen');
      const newImages = [...form.images];
      newImages[index] = data.url;
      setField('images', newImages);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error rotando imagen');
    } finally {
      setRotatingIndex(null);
    }
  }

  function moveImage(from: number, to: number) {
    const imgs = [...form.images];
    const [item] = imgs.splice(from, 1);
    imgs.splice(to, 0, item);
    setField('images', imgs);
  }

  async function handlePopupFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPopup(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error subiendo imagen');
      setField('popupImage', data.url);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error subiendo imagen del popup');
    } finally {
      setUploadingPopup(false);
      if (popupFileRef.current) popupFileRef.current.value = '';
    }
  }

  // ── Grupos de variantes ───────────────────────────────────────────────────
  function addGroup() {
    setGroupInputs(prev => [...prev, { name: '', optionsStr: '', imageMap: {}, colorPick: '#000000', customEntry: '' }]);
  }

  function removeGroup(index: number) {
    setGroupInputs(prev => prev.filter((_, i) => i !== index));
  }

  function updateGroup(index: number, field: 'name' | 'optionsStr' | 'colorPick' | 'customEntry', value: string) {
    setGroupInputs(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  }

  function addOption(groupIndex: number, value: string) {
    setGroupInputs(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g;
      const existing = parseOptions(g.optionsStr);
      if (existing.some(o => o.toLowerCase() === value.toLowerCase())) return g;
      return { ...g, optionsStr: [...existing, value].join(', ') };
    }));
  }

  function removeOption(groupIndex: number, value: string) {
    setGroupInputs(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g;
      const updated = parseOptions(g.optionsStr).filter(o => o.toLowerCase() !== value.toLowerCase());
      return { ...g, optionsStr: updated.join(', ') };
    }));
  }

  function updateGroupImageMap(groupIndex: number, option: string, imageIndex: number | undefined) {
    setGroupInputs(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g;
      const newMap = { ...g.imageMap };
      if (imageIndex === undefined) {
        delete newMap[option];
      } else {
        newMap[option] = imageIndex;
      }
      return { ...g, imageMap: newMap };
    }));
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
        const result: VariantGroup = { name: g.name.trim(), options };
        if (Object.keys(g.imageMap).length > 0) result.imageMap = g.imageMap;
        return result;
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
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : null,
          variantGroups: parseGroups(),
        }),
      });
      if (!res.ok) throw new Error('Error guardando producto');
      Toast.fire({ icon: 'success', title: 'Producto guardado correctamente' });
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
        <p className="bg-gray-50 border border-red-200 text-black text-sm px-4 py-3 rounded-lg">{apiError}</p>
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

      {/* Categoría + Precio + Costo */}
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

      {/* Costo de compra */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label className="text-xs uppercase tracking-widest text-gray-500 font-medium">Costo de compra — Proveedor (COP)</label>
          <span className="text-[10px] text-gray-300">opcional · solo visible en el admin</span>
        </div>
        <div className="relative">
          <input
            type="number"
            min={0}
            value={form.purchaseCost ?? ''}
            onChange={e => setField('purchaseCost', e.target.value === '' ? undefined : Number(e.target.value))}
            className="border border-gray-200 focus:border-green-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors w-full max-w-xs"
            placeholder="Ej: 28000"
          />
          {form.purchaseCost && form.price > 0 && (
            <span className="ml-3 text-xs text-green-600 font-semibold">
              Margen: {Math.round(((form.price - form.purchaseCost) / form.price) * 100)}% · Ganancia: ${(form.price - form.purchaseCost).toLocaleString('es-CO')}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400">Usado para calcular la rentabilidad en el dashboard</p>
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
            className="text-xs text-black hover:text-black font-semibold transition-colors">
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
          const isColorGroup = g.name.trim().toLowerCase().includes('color');
          const isSizeGroup = g.name.trim().toLowerCase().includes('talla');

          return (
            <div key={i} className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
              showGrpErr && err ? 'border-red-300 bg-gray-50/30' : 'border-gray-200'
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
                        ? 'border-gray-400 bg-gray-50 focus:border-gray-1000'
                        : 'border-gray-200 focus:border-gray-400'
                    }`}
                  />
                  {showGrpErr && <FieldError msg={err?.name} />}
                </div>
                <button type="button" onClick={() => removeGroup(i)}
                  className="mt-6 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title="Eliminar grupo">×</button>
              </div>

              {isColorGroup ? (
                /* ── Selector de colores ── */
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400">Colores</label>

                  {/* Paleta de colores agregados */}
                  {opts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {opts.map((hex, j) => {
                        const isDupe = dupes.has(hex.toLowerCase());
                        return (
                          <div key={j} className="relative group/swatch flex flex-col items-center gap-0.5">
                            <div
                              className={`w-8 h-8 rounded-full border-2 ${isDupe ? 'border-amber-400' : 'border-gray-200'}`}
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(i, hex)}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-400 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity"
                              title="Quitar color"
                            >×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Colores básicos */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Colores básicos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASIC_COLORS.map(({ hex, label }) => {
                        const alreadyAdded = parseOptions(g.optionsStr).some(o => o.toLowerCase() === hex.toLowerCase());
                        return (
                          <button
                            key={hex}
                            type="button"
                            title={alreadyAdded ? `${label} (ya agregado)` : `Agregar ${label}`}
                            onClick={() => alreadyAdded ? removeOption(i, hex) : addOption(i, hex)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${
                              alreadyAdded
                                ? 'border-black ring-2 ring-black ring-offset-1'
                                : hex === '#FFFFFF' || hex === '#F5F0E8' || hex === '#FCD5B0' || hex === '#D1D5DB' || hex === '#F5F0E8'
                                  ? 'border-gray-300 hover:border-gray-500'
                                  : 'border-transparent hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Picker personalizado */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <label className="text-[10px] text-gray-400 shrink-0">Color personalizado:</label>
                    <input
                      type="color"
                      value={g.colorPick}
                      onChange={e => updateGroup(i, 'colorPick', e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
                    />
                    <span className="text-xs text-gray-400 font-mono">{g.colorPick}</span>
                    <button
                      type="button"
                      onClick={() => addOption(i, g.colorPick)}
                      className="ml-auto text-xs font-semibold text-white bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Agregar
                    </button>
                  </div>

                  {showGrpErr && <FieldError msg={err?.options} />}
                </div>
              ) : isSizeGroup ? (
                /* ── Selector de tallas ── */
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400">Tallas</label>

                  {/* Tallas agregadas (no preset) */}
                  {opts.filter(o => !BASIC_SIZES.some(s => s.toLowerCase() === o.toLowerCase())).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {opts.filter(o => !BASIC_SIZES.some(s => s.toLowerCase() === o.toLowerCase())).map((opt, j) => {
                        const isDupe = dupes.has(opt.toLowerCase());
                        return (
                          <span key={j} className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1 ${
                            isDupe ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {opt}
                            <button type="button" onClick={() => removeOption(i, opt)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Tallas preset */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Tallas comunes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASIC_SIZES.map(size => {
                        const added = opts.some(o => o.toLowerCase() === size.toLowerCase());
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => added ? removeOption(i, size) : addOption(i, size)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                              added
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-black'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Talla personalizada */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <label className="text-[10px] text-gray-400 shrink-0">Otra talla:</label>
                    <input
                      value={g.customEntry}
                      onChange={e => updateGroup(i, 'customEntry', e.target.value)}
                      placeholder="Ej: 38, 40, 42..."
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400 flex-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); const v = g.customEntry.trim(); if (v) { addOption(i, v); updateGroup(i, 'customEntry', ''); } }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { const v = g.customEntry.trim(); if (v) { addOption(i, v); updateGroup(i, 'customEntry', ''); } }}
                      className="text-xs font-semibold text-white bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Agregar
                    </button>
                  </div>

                  {showGrpErr && <FieldError msg={err?.options} />}
                </div>
              ) : (
                /* ── Opciones de texto ── */
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
                        ? 'border-gray-400 bg-gray-50 focus:border-gray-1000'
                        : 'border-gray-200 focus:border-gray-400'
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
              )}

                {opts.filter(o => !dupes.has(o.toLowerCase())).length > 0 && form.images.length > 1 && (
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Vincular opción → imagen</p>
                    <div className="flex flex-col gap-2">
                      {opts.filter(o => !dupes.has(o.toLowerCase())).map(opt => (
                        <div key={opt} className="flex items-center gap-2">
                          {isColorGroup ? (
                            <div
                              className="w-6 h-6 rounded-full border border-gray-200 shrink-0"
                              style={{ backgroundColor: opt }}
                              title={opt}
                            />
                          ) : (
                            <span className="text-xs text-gray-500 w-24 truncate shrink-0">{opt}</span>
                          )}
                          <div className="flex gap-1.5 flex-wrap">
                            {form.images.map((img, imgIdx) => (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => updateGroupImageMap(i, opt, g.imageMap[opt] === imgIdx ? undefined : imgIdx)}
                                className={`relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all ${
                                  g.imageMap[opt] === imgIdx
                                    ? 'border-black ring-1 ring-black'
                                    : 'border-gray-200 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <Image src={img} alt={`imagen ${imgIdx + 1}`} fill sizes="36px" className="object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragImgIndex(i)}
              onDragEnter={() => setDragImgOver(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragImgIndex !== null && dragImgIndex !== i) moveImage(dragImgIndex, i);
                setDragImgIndex(null);
                setDragImgOver(null);
              }}
              onDragEnd={() => { setDragImgIndex(null); setDragImgOver(null); }}
              className={`relative group aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing transition-all ${
                dragImgIndex === i
                  ? 'opacity-40 ring-2 ring-red-300'
                  : dragImgOver === i && dragImgIndex !== null
                  ? 'ring-2 ring-red-500'
                  : ''
              }`}
            >
              <Image src={url} alt={`imagen ${i + 1}`} fill sizes="25vw" className="object-cover pointer-events-none" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-black text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold pointer-events-none">
                  Principal
                </span>
              )}
              <div className="absolute inset-0 bg-black/10 sm:bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {rotatingIndex === i ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-white text-xs">Rotando...</span>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => removeImage(i)} title="Eliminar"
                      className="absolute top-1 right-1 w-6 h-6 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white transition-colors text-xs shadow z-10">×</button>
                    
                    <button type="button" onClick={() => rotateImage(i, 'left')} title="Girar izquierda"
                      className="absolute bottom-1 left-1 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors text-xs shadow z-10">↺</button>
                    
                    <button type="button" onClick={() => rotateImage(i, 'right')} title="Girar derecha"
                      className="absolute bottom-1 right-1 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors text-xs shadow z-10">↻</button>

                    <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
                      {i > 0 && (
                        <button type="button" onClick={() => moveImage(i, i - 1)} title="Mover izquierda"
                          className="w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors pointer-events-auto shadow text-xs">←</button>
                      )}
                      {i < form.images.length - 1 && (
                        <button type="button" onClick={() => moveImage(i, i + 1)} title="Mover derecha"
                          className="w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition-colors pointer-events-auto shadow text-xs">→</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
              showError('images') && formErrors.images
                ? 'border-red-300 text-gray-400 hover:border-gray-400'
                : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-400'
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

      {/* Visibilidad + Envío gratis */}
      <div className="flex flex-col gap-3">
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
              form.active ? 'bg-black' : 'bg-gray-200'
            }`}
            aria-label="Toggle visibilidad"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              form.active ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-black">Envío gratis</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.freeShipping
                ? 'Este producto tiene envío gratis a todo Colombia'
                : 'Se cobra el envío según el departamento del cliente'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('freeShipping', !form.freeShipping)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              form.freeShipping ? 'bg-green-500' : 'bg-gray-200'
            }`}
            aria-label="Toggle envío gratis"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              form.freeShipping ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-black">Producto agotado</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.soldOut
                ? 'Se muestra como agotado y no se puede agregar al carrito'
                : 'El producto está disponible para comprar'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('soldOut', !form.soldOut)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              form.soldOut ? 'bg-gray-700' : 'bg-gray-200'
            }`}
            aria-label="Toggle agotado"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              form.soldOut ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className={`border rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${
          form.lastUnits ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'
        }`}>
          <div>
            <p className="text-sm font-medium text-black">Últimas unidades</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.lastUnits
                ? 'Muestra badge de urgencia "Últimas unidades" en la tarjeta'
                : 'Sin badge de urgencia'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('lastUnits', !form.lastUnits)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              form.lastUnits ? 'bg-orange-500' : 'bg-gray-200'
            }`}
            aria-label="Toggle últimas unidades"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              form.lastUnits ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Stock control */}
        <div className={`border rounded-xl overflow-hidden transition-colors ${
          form.stockTracked ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black">Controlar stock</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.stockTracked
                  ? 'Se descuenta stock automáticamente al confirmar pedidos'
                  : 'El stock no se controla para este producto'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setField('stockTracked', !form.stockTracked)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.stockTracked ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              aria-label="Toggle stock tracking"
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.stockTracked ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {form.stockTracked && (
            <div className="px-4 pb-4 border-t border-blue-100 pt-3">
              <label className="text-[10px] uppercase tracking-widest text-blue-600 font-medium block mb-1.5">
                Unidades disponibles
              </label>
              <input
                type="number"
                min={0}
                value={form.stock ?? ''}
                onChange={e => setField('stock', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 w-32"
                placeholder="0"
              />
              <p className="text-[10px] text-blue-400 mt-1">Al llegar a 0 el producto se marcará como agotado</p>
            </div>
          )}
        </div>

        <div className={`border rounded-xl overflow-hidden transition-colors ${
          form.showPopup ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black">Mostrar aviso al agregar al carrito</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.showPopup
                  ? 'Se mostrará un popup con imagen antes de confirmar'
                  : 'El producto se agrega al carrito sin aviso previo'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setField('showPopup', !form.showPopup)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.showPopup ? 'bg-amber-500' : 'bg-gray-200'
              }`}
              aria-label="Toggle popup"
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.showPopup ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {form.showPopup && (
            <div className="px-4 pb-4 border-t border-amber-100 pt-3 flex flex-col gap-3">
              <p className="text-xs text-amber-700 font-medium">Imagen del popup</p>

              {form.popupImage ? (
                <div className="flex flex-col gap-2">
                  <div className="relative w-full max-w-xs aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    <Image src={form.popupImage} alt="Imagen del popup" fill sizes="320px" className="object-cover" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => popupFileRef.current?.click()}
                      disabled={uploadingPopup}
                      className="text-xs border border-gray-200 hover:border-black text-gray-600 hover:text-black px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploadingPopup ? 'Subiendo...' : 'Cambiar imagen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('popupImage', '')}
                      className="text-xs text-red-500 hover:text-black transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => popupFileRef.current?.click()}
                  disabled={uploadingPopup}
                  className="w-full max-w-xs aspect-[4/3] rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center gap-2 text-amber-500 hover:border-amber-500 transition-colors disabled:opacity-50"
                >
                  {uploadingPopup ? (
                    <span className="text-xs">Subiendo...</span>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-medium">Subir imagen del popup</span>
                      <span className="text-[10px] text-amber-400">Recomendado: 800×600 px</span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={popupFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePopupFileChange}
                disabled={uploadingPopup}
              />
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving || uploading}
          className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors">
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
