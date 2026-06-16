import AdminNav from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="lg:ml-56 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
