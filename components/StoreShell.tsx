'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import CartSidebar from './CartSidebar';

interface Props {
  children: React.ReactNode;
  announcement?: { text: string; enabled: boolean };
}

export default function StoreShell({ children, announcement }: Props) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <AnnouncementBar text={announcement?.text} enabled={announcement?.enabled} />
      <Header />
      <CartSidebar />
      {children}
    </>
  );
}
