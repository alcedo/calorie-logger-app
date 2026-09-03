import type { NextConfig } from "next";

const verifyDistDir = process.env.NEXT_DIST_DIR;
const nextConfig: NextConfig = {
  // Isolated verify-macro / extra `next dev` instances. Must stay inside the
  // project (Next rejects `../…`). Default remains `.next`.
  ...(verifyDistDir && !verifyDistDir.includes("..")
    ? { distDir: verifyDistDir }
    : {}),
};

export default nextConfig;
