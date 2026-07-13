import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load sharp from node_modules at runtime (with its native libvips binary)
  // instead of bundling it — fixes ERR_DLOPEN on Vercel serverless.
  serverExternalPackages: ["sharp"],
  // Ship the embedded cover fonts into the API function bundle. (sharp's native
  // binary is bundled correctly by the webpack build — see the --webpack flag.)
  outputFileTracingIncludes: {
    "/api/**": ["./public/fonts/**"],
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
