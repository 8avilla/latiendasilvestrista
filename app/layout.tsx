import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { PopupProvider } from "@/components/PopupProvider";
import StoreShell from "@/components/StoreShell";
import { getDb } from "@/lib/mongodb";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://verzus.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Verzus — Ropa para gente como tú',
    template: '%s | Verzus',
  },
  description:
    'Verzus es una marca colombiana de ropa con diseños exclusivos. Camisetas, gorras y accesorios para gente como tú. Envíos a toda Colombia.',
  keywords: [
    'Verzus', 'ropa Colombia', 'marca colombiana', 'camisetas exclusivas',
    'ropa streetwear', 'gorras Colombia', 'moda colombiana',
    'ropa con diseño', 'tienda ropa online Colombia',
  ],
  authors: [{ name: 'Verzus' }],
  creator: 'Verzus',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: SITE_URL,
    siteName: 'Verzus',
    title: 'Verzus — Ropa para gente como tú',
    description: 'Marca colombiana de ropa con diseños exclusivos. Camisetas, gorras y accesorios. Envíos a toda Colombia.',
    images: [{ url: '/images/hero_colombia.jpg', width: 1200, height: 630, alt: 'Verzus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verzus — Ropa para gente como tú',
    description: 'Marca colombiana de ropa con diseños exclusivos. Envíos a toda Colombia.',
    images: ['/images/hero_colombia.jpg'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verzus',
  url: SITE_URL,
  logo: `${SITE_URL}/images/hero_colombia.jpg`,
  description: 'Marca colombiana de ropa con diseños exclusivos para gente como tú.',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+57-300-434-0482',
    contactType: 'customer service',
    availableLanguage: 'Spanish',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Verzus',
  url: SITE_URL,
};

async function getAnnouncementSettings(): Promise<{ text: string; enabled: boolean } | undefined> {
  try {
    const db = await getDb();
    const doc = await db.collection('settings').findOne({ _id: 'main' as unknown as import('mongodb').ObjectId });
    if (doc?.announcement) return doc.announcement as { text: string; enabled: boolean };
  } catch { /* fallback to defaults */ }
  return undefined;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const announcement = await getAnnouncementSettings();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${dmSerifDisplay.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <CartProvider>
          <PopupProvider>
            <StoreShell announcement={announcement}>
              {children}
            </StoreShell>
          </PopupProvider>
        </CartProvider>
      </body>
    </html>
  );
}
