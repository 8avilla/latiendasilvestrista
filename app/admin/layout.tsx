'use client';

import AdminNav from '@/components/admin/AdminNav';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="lg:ml-56 pt-14 lg:pt-0">
        <div className="max-w-[1600px] mx-auto px-4 py-6 md:px-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

