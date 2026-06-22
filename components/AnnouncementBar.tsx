interface Props {
  text?: string;
  enabled?: boolean;
}

const DEFAULT_TEXT = 'Nueva Colección · Envíos a toda Colombia · Pago Seguro con Bold · Diseños Exclusivos · Ropa para gente como tú · Verzus';

export default function AnnouncementBar({ text = DEFAULT_TEXT, enabled = true }: Props) {
  if (!enabled) return null;
  const content = text + ' · ';
  return (
    <div className="bg-black text-white overflow-hidden py-2.5 select-none" aria-hidden="true">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">{content}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" aria-hidden="true">{content}</span>
      </div>
    </div>
  );
}
