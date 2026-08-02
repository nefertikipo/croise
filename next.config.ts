import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load sharp from node_modules at runtime (with its native libvips binary)
  // instead of bundling it — fixes ERR_DLOPEN on Vercel serverless.
  serverExternalPackages: ["sharp"],
  // Ship the embedded cover fonts into the API function bundle. (sharp's native
  // binary is bundled correctly by the webpack build — see the --webpack flag.)
  outputFileTracingIncludes: {
    // The fléché worker pool loads this esbuild-prebuilt standalone bundle at
    // runtime (built by scripts/build-fleche-worker.mjs). It must be traced into
    // the API function or the pool can't spawn workers and generation falls back
    // to the slow single-threaded path. See src/lib/crossword/fleche-pool.ts.
    "/api/**": [
      "./public/fonts/**",
      "./public/motifs/**",
      "./worker-dist/**",
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
