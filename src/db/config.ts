import path from "node:path";
import {
  isServerlessHost,
  VERCEL_DB_REQUIRED_ERROR,
} from "@/lib/runtime";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
  filePath?: string;
  remote: boolean;
}

export function isRemoteLibsqlUrl(url: string): boolean {
  return /^(libsql|https|http):\/\//i.test(url.trim());
}

export function resolveDatabaseConfig(opts?: {
  dbFilePath?: string;
  env?: NodeJS.ProcessEnv;
}): DatabaseConfig {
  const env = opts?.env ?? process.env;
  const turso = env.TURSO_DATABASE_URL?.trim();

  if (turso && isRemoteLibsqlUrl(turso)) {
    const authToken = env.TURSO_AUTH_TOKEN?.trim();
    return {
      url: turso,
      authToken: authToken || undefined,
      remote: true,
    };
  }

  if (turso?.startsWith("file:")) {
    const filePath = path.resolve(turso.slice("file:".length));
    return { url: `file:${filePath}`, filePath, remote: false };
  }

  if (
    isServerlessHost(env) &&
    !opts?.dbFilePath &&
    !env.CALORIE_LOGGER_DB_PATH
  ) {
    throw new Error(VERCEL_DB_REQUIRED_ERROR);
  }

  const filePath = path.resolve(
    opts?.dbFilePath ||
      env.CALORIE_LOGGER_DB_PATH ||
      path.join(process.cwd(), "data", "app.db"),
  );
  return { url: `file:${filePath}`, filePath, remote: false };
}
