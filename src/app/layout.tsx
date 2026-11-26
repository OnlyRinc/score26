import type { Metadata, Viewport } from "next";
import { Inter, Oswald, Kaushan_Script } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const script = Kaushan_Script({ variable: "--font-kaushan", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Score26",
  description: "Dart-Counter mit Turniermodus",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Score26", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} ${oswald.variable} ${script.variable}`}>
      <body className="antialiased min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
