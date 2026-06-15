import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { PopupProvider } from "@/components/PopupProvider";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import CartSidebar from "@/components/CartSidebar";
import Script from "next/script";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://latiendasilvestrista.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'La Tienda Silvestrista — Silvestre Dangond',
    template: '%s | La Tienda Silvestrista',
  },
  description:
    'Tienda oficial del movimiento silvestrista. Camisetas, gorras, sombreros, manillas y vasos de Silvestre Dangond. Envíos a toda Colombia.',
  keywords: [
    'Silvestre Dangond', 'tienda silvestrista', 'camisetas Silvestre Dangond',
    'movimiento silvestrista', 'ropa vallenato', 'gorras Silvestre Dangond',
    'merchandise Silvestre Dangond', 'tienda oficial Silvestre', 'el rey del vallenato',
  ],
  authors: [{ name: 'La Tienda Silvestrista' }],
  creator: 'La Tienda Silvestrista',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: SITE_URL,
    siteName: 'La Tienda Silvestrista',
    title: 'La Tienda Silvestrista — Silvestre Dangond',
    description: 'Tienda oficial del movimiento silvestrista. Camisetas, gorras, sombreros y más. Envíos a toda Colombia.',
    images: [{ url: '/images/hero_colombia.jpg', width: 1200, height: 630, alt: 'La Tienda Silvestrista' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Tienda Silvestrista — Silvestre Dangond',
    description: 'Tienda oficial del movimiento silvestrista. Envíos a toda Colombia.',
    images: ['/images/hero_colombia.jpg'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'La Tienda Silvestrista',
  url: SITE_URL,
  logo: `${SITE_URL}/images/hero_colombia.jpg`,
  description: 'Tienda oficial del movimiento silvestrista de Silvestre Dangond.',
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
  name: 'La Tienda Silvestrista',
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <AnnouncementBar />
            <Header />
            <CartSidebar />
            {children}
          </PopupProvider>
        </CartProvider>
        <Script
          src="https://checkout.bold.co/library/boldPaymentButton.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
