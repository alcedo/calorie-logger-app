import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native libSQL client out of the server bundle (Vercel + local).
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
