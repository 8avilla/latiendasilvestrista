import { getDb } from '@/lib/mongodb';
import ConfigForm from './ConfigForm';

interface Settings {
  announcement: { text: string; enabled: boolean };
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  storeInfo: {
    name: string;
    description: string;
    logoUrl: string;
  };
  shipping: {
    baseCost: number;
    freeThreshold: number;
    enabled: boolean;
  };
  integrations: {
    boldSandbox: boolean;
    adminEmail: string;
  };
}

const DEFAULT: Settings = {
  announcement: { text: 'Colección Oficial · Envíos a toda Colombia · Pago Seguro con Bold · El Rey del Vallenato · Silvestre Dangond · Productos Originales', enabled: true },
  whatsapp: '3004340482',
  instagram: '',
  tiktok: '',
  facebook: '',
  storeInfo: {
    name: 'La Tienda Silvestrista',
    description: 'La tienda oficial del Rey del Vallenato.',
    logoUrl: '/logo.png',
  },
  shipping: {
    baseCost: 15000,
    freeThreshold: 250000,
    enabled: true,
  },
  integrations: {
    boldSandbox: true,
    adminEmail: '',
  }
};

export default async function ConfiguracionPage() {
  let settings: Settings = DEFAULT;
  try {
    const db = await getDb();
    const doc = await db.collection('settings').findOne({ _id: 'main' as unknown as import('mongodb').ObjectId });
    if (doc) {
      const rest = { ...doc } as Record<string, unknown>;
      delete rest._id;
      delete rest.updatedAt;
      settings = { ...DEFAULT, ...rest } as Settings;
    }
  } catch {
    // use defaults
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-serif italic text-black">Configuración General</h1>
        <p className="text-xs text-gray-400 mt-0.5">Ajustes generales de la tienda</p>
      </div>
      <ConfigForm initial={settings} />
    </div>
  );
}
