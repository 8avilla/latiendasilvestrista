const ITEMS = [
  'Colección Oficial',
  'Envíos a toda Colombia',
  'Pago Seguro con Bold',
  'El Rey del Vallenato',
  'Silvestre Dangond',
  'Productos Originales',
  'Colección Oficial',
  'Envíos a toda Colombia',
  'Pago Seguro con Bold',
  'El Rey del Vallenato',
  'Silvestre Dangond',
  'Productos Originales',
];

const CONTENT = ITEMS.join(' · ') + ' · ';

export default function AnnouncementBar() {
  return (
    <div className="bg-black text-white overflow-hidden py-2.5 select-none" aria-hidden="true">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">
          {CONTENT}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" aria-hidden="true">
          {CONTENT}
        </span>
      </div>
    </div>
  );
}
