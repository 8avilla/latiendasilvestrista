import ProductForm from '@/components/admin/ProductForm';
import AdminBackLink from '@/components/admin/AdminBackLink';

export default function NuevoProductoPage() {
  return (
    <div>
      <AdminBackLink href="/admin/productos" label="Volver a productos" />
      <h1 className="text-2xl font-serif italic text-black mb-8">Nuevo producto</h1>
      <ProductForm />
    </div>
  );
}
