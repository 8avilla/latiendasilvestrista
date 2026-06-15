export interface DeptInfo {
  name: string;
  municipalities: string[];
}

export const DEPARTMENTS: DeptInfo[] = [
  { name: 'Bogotá D.C.', municipalities: ['Bogotá D.C.'] },
  { name: 'Amazonas', municipalities: ['Leticia', 'Puerto Nariño'] },
  { name: 'Antioquia', municipalities: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Apartadó', 'Turbo', 'Caucasia', 'Sabaneta', 'Copacabana', 'La Estrella', 'Caldas', 'Marinilla', 'Guarne', 'La Ceja', 'El Santuario', 'Girardota', 'Santa Fe de Antioquia', 'Yarumal', 'Segovia', 'El Bagre', 'Tarazá', 'Amagá', 'Andes', 'Urrao', 'Sonsón', 'Puerto Berrío', 'Necoclí', 'Carepa', 'Chigorodó', 'Sopetrán', 'Jardín', 'Guatapé', 'San Jerónimo'] },
  { name: 'Arauca', municipalities: ['Arauca', 'Saravena', 'Tame', 'Arauquita', 'Fortul'] },
  { name: 'Atlántico', municipalities: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanagrande', 'Puerto Colombia', 'Galapa', 'Baranoa', 'Sabanalarga', 'Santo Tomás', 'Palmar de Varela', 'Luruaco', 'Campo de la Cruz'] },
  { name: 'Bolívar', municipalities: ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar', 'Mompox', 'María La Baja', 'San Jacinto', 'Talaigua Nuevo', 'Simití', 'Santa Rosa del Sur'] },
  { name: 'Boyacá', municipalities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Villa de Leyva', 'Paipa', 'Puerto Boyacá', 'Moniquirá', 'Nobsa', 'Samacá', 'Ramiriquí', 'Garagoa', 'Guateque', 'Muzo', 'Soatá', 'Cocuy'] },
  { name: 'Caldas', municipalities: ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio', 'Anserma', 'Salamina', 'Neira', 'Pensilvania', 'Aguadas', 'Supía', 'Manzanares'] },
  { name: 'Caquetá', municipalities: ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'Belén de los Andaquíes', 'El Doncello', 'El Paujil', 'Valparaíso'] },
  { name: 'Casanare', municipalities: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Monterrey', 'Paz de Ariporo', 'Hato Corozal', 'Maní'] },
  { name: 'Cauca', municipalities: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía', 'El Tambo', 'Silvia', 'Miranda', 'Caloto', 'Corinto', 'Guapí', 'Timbiquí'] },
  { name: 'Cesar', municipalities: ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'La Jagua de Ibirico', 'Curumaní', 'San Alberto', 'El Copey', 'Chiriguaná', 'La Paz', 'Pailitas', 'Chimichagua', 'San Diego', 'Manaure Balcón del Cesar'] },
  { name: 'Chocó', municipalities: ['Quibdó', 'Istmina', 'Condoto', 'Nuquí', 'Bahía Solano', 'Acandí', 'Tadó', 'Riosucio', 'Unguía'] },
  { name: 'Córdoba', municipalities: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Planeta Rica', 'Montelíbano', 'Ciénaga de Oro', 'Tierralta', 'Chinú', 'San Andrés de Sotavento', 'Anapoima', 'Ayapel', 'Purísima', 'Tuchín'] },
  { name: 'Cundinamarca', municipalities: ['Zipaquirá', 'Soacha', 'Chía', 'Facatativá', 'Fusagasugá', 'Girardot', 'Mosquera', 'Funza', 'Madrid', 'Cajicá', 'Tocancipá', 'Sopó', 'Cota', 'La Calera', 'Sibaté', 'Villeta', 'Pacho', 'Ubaté', 'La Mesa', 'San Francisco', 'Tocaima', 'Guaduas', 'Choachí', 'Suesca'] },
  { name: 'Guainía', municipalities: ['Inírida', 'Barrancominas'] },
  { name: 'Guaviare', municipalities: ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores'] },
  { name: 'Huila', municipalities: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'San Agustín', 'Yaguará', 'Rivera', 'Gigante', 'Palermo'] },
  { name: 'La Guajira', municipalities: ['Riohacha', 'Maicao', 'Uribia', 'San Juan del Cesar', 'Fonseca', 'Barrancas', 'Villanueva', 'Manaure', 'Dibulla', 'Hatonuevo', 'Distracción'] },
  { name: 'Magdalena', municipalities: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Aracataca', 'Pivijay', 'Sitionuevo', 'San Sebastián de Buenavista', 'Guamal'] },
  { name: 'Meta', municipalities: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Puerto Gaitán', 'San Martín', 'Cumaral', 'Restrepo', 'Mesetas', 'Vista Hermosa'] },
  { name: 'Nariño', municipalities: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'Samaniego', 'La Unión', 'Barbacoas', 'Sandoná', 'Ricaurte', 'Cumbal'] },
  { name: 'Norte de Santander', municipalities: ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios', 'Tibú', 'El Zulia', 'Chinácota', 'Ábrego', 'Pamplonita', 'Toledo'] },
  { name: 'Putumayo', municipalities: ['Mocoa', 'Orito', 'Puerto Asís', 'Sibundoy', 'Valle del Guamez', 'Santiago', 'Puerto Leguízamo'] },
  { name: 'Quindío', municipalities: ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'La Tebaida', 'Salento', 'Filandia', 'Circasia', 'Génova', 'Pijao'] },
  { name: 'Risaralda', municipalities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Belén de Umbría', 'Apía', 'Santuario', 'Marsella', 'Quinchía'] },
  { name: 'San Andrés y Providencia', municipalities: ['San Andrés', 'Providencia'] },
  { name: 'Santander', municipalities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Barbosa', 'Málaga', 'Rionegro', 'Lebrija', 'Zapatoca', 'Vélez', 'Pinchote', 'Barichara'] },
  { name: 'Sucre', municipalities: ['Sincelejo', 'Corozal', 'Tolú', 'Coveñas', 'San Marcos', 'Sampués', 'Morroa', 'San Onofre', 'Majagual', 'Galeras'] },
  { name: 'Tolima', municipalities: ['Ibagué', 'Melgar', 'Espinal', 'Mariquita', 'Honda', 'Líbano', 'Chaparral', 'Purificación', 'Flandes', 'Guamo', 'Cajamarca', 'Lérida'] },
  { name: 'Valle del Cauca', municipalities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Yumbo', 'Jamundí', 'Florida', 'Pradera', 'Sevilla', 'Caicedonia', 'Zarzal', 'Roldanillo', 'Guacarí', 'La Unión', 'Ansermanuevo', 'Dagua', 'Calima El Darién'] },
  { name: 'Vaupés', municipalities: ['Mitú', 'Carurú', 'Taraira'] },
  { name: 'Vichada', municipalities: ['Puerto Carreño', 'Santa Rosalía', 'Cumaribo', 'La Primavera'] }
];

export function calculateShipping(department: string, subtotal: number): number {
  if (subtotal >= 150000) return 0; // Envío gratis
  if (!department) return 12000;
  
  const dept = department.toLowerCase();
  if (dept.includes('cesar')) return 6000; // Local
  if (
    dept.includes('amazonas') || 
    dept.includes('guainía') || 
    dept.includes('vaupés') || 
    dept.includes('vichada') ||
    dept.includes('san andrés')
  ) {
    return 18000; // Distante
  }
  return 12000; // Nacional estándar
}
