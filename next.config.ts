import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load sharp from node_modules at runtime (with its native libvips binary)
  // instead of bundling it — fixes ERR_DLOPEN on Vercel serverless.
  serverExternalPackages: ["sharp"],
  // Force sharp's native binaries (from pnpm's store) + the embedded cover
  // fonts into the API function bundle — Vercel's tracer misses them otherwise.
  outputFileTracingIncludes: {
    "/api/**": [
      "./public/fonts/**",
      "./node_modules/.pnpm/@img+*/node_modules/@img/**",
      "./node_modules/.pnpm/sharp@*/node_modules/sharp/**",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
