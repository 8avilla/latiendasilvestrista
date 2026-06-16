import Link from 'next/link';

export default function AdminBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors mb-6 group"
    >
      <svg
        className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
