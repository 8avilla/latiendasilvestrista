'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import CartSidebar from './CartSidebar';

export default function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <AnnouncementBar />
      <Header />
      <CartSidebar />
      {children}
    </>
  );
}
