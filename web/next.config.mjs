import path from "node:path";
import { fileURLToPath } from "node:url";

/** Brauzer faqat shu saytga murojaat qiladi; /api va /uploads backend (Node.js) ga yo'naltiriladi. */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bir nechta package-lock.json borligi haqidagi ogohlantirishni o'chiradi
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
