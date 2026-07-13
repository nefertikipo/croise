import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load sharp from node_modules at runtime (with its native libvips binary)
  // instead of bundling it — fixes ERR_DLOPEN on Vercel serverless.
  serverExternalPackages: ["sharp"],
  // Ship the embedded cover fonts into the API function bundle so the PDF
  // engine can read them via fs on serverless.
  outputFileTracingIncludes: {
    "/api/books/**": ["./public/fonts/**"],
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
