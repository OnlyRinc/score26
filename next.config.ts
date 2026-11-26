import type { NextConfig } from "next";

// Statischer Export: Die App besteht nur aus fertigen Dateien. Das macht Hosting einfach
// und erlaubt später, dieselben Dateien mit Capacitor in eine App-Store-App zu packen.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
