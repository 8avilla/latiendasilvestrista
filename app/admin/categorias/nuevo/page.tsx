import CategoryForm from '@/components/admin/CategoryForm';
import AdminBackLink from '@/components/admin/AdminBackLink';

export default function NuevaCategoriaPage() {
  return (
    <div>
      <AdminBackLink href="/admin/categorias" label="Volver a categorías" />
      <h1 className="text-2xl font-serif italic text-black mb-8">Nueva categoría</h1>
      <CategoryForm />
    </div>
  );
}
