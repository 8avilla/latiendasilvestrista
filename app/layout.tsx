import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
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

export const metadata: Metadata = {
  title: "La Tienda Silvestrista — Silvestre Dangond",
  description:
    "Productos oficiales del movimiento silvestrista de Silvestre Dangond. Camisetas, gorras, sombreros, manillas y vasos.",
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
      <body className="min-h-full flex flex-col bg-white">
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <CartSidebar />
          {children}
        </CartProvider>
        <Script
          src="https://checkout.bold.co/library/boldPaymentButton.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
