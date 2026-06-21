const fs = require('fs');
const path = '/home/ivan/Documentos/Proyectos/latiendasilvestrista/app/admin/pedidos/OrdersList.tsx';
let content = fs.readFileSync(path, 'utf8');

// Insert imports and helpers
if (!content.includes("import Swal from 'sweetalert2';")) {
  content = content.replace(
    "import * as XLSX from 'xlsx';",
    `import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const showErrorToast = (msg: string) => Toast.fire({ icon: 'error', title: msg });
const showSuccessToast = (msg: string) => Toast.fire({ icon: 'success', title: msg });
const showInfoToast = (msg: string) => Toast.fire({ icon: 'info', title: msg });`
  );
}

// Replace specific success alerts
content = content.replace(
  /alert\(`Actualización completa\. \$\{msg\}`\);/g,
  'showSuccessToast(`Actualización completa. ${msg}`);'
);
content = content.replace(
  /alert\(`Correos enviados: \$\{data\.sent\}\. Fallidos: \$\{data\.failed\}\.`\);/g,
  'showSuccessToast(`Correos enviados: ${data.sent}. Fallidos: ${data.failed}.`);'
);

// Replace the rest of alerts as errors
content = content.replace(/alert\((.*?)\);/g, 'showErrorToast($1);');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced alerts in OrdersList.tsx');
