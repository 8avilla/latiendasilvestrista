const fs = require('fs');
const path = '/home/ivan/Documentos/Proyectos/latiendasilvestrista/app/admin/pedidos/OrdersList.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace handleQuickDelete
content = content.replace(
  /async function handleQuickDelete\(orderId: string\) \{\n    setQuickDeleting\(true\);/g,
  `async function handleQuickDelete(orderId: string) {
    const result = await Swal.fire({
      title: '¿Mover a papelera?',
      text: "El pedido se ocultará de la lista principal",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    setQuickDeleting(true);`
);

// Replace handleDelete
content = content.replace(
  /async function handleDelete\(\) \{\n    if \(!editingOrder\) return;\n    setIsDeleting\(true\);/g,
  `async function handleDelete() {
    if (!editingOrder) return;
    const result = await Swal.fire({
      title: '¿Mover a papelera?',
      text: "El pedido se ocultará de la lista principal",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    setIsDeleting(true);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced confirms in OrdersList.tsx');
