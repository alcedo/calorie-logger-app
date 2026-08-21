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

/** Minimal env bag so tests can pass partial objects. */
export type EnvBag = Record<string, string | undefined>;

export function isRemoteLibsqlUrl(url: string): boolean {
  return /^(libsql|https|http):\/\//i.test(url.trim());
}

function resolveOverrideFile(filePath: string): string {
  return path.resolve(/* turbopackIgnore: true */ filePath);
}

export function resolveDatabaseConfig(opts?: {
  dbFilePath?: string;
  env?: EnvBag;
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
    const filePath = resolveOverrideFile(turso.slice("file:".length));
    return { url: `file:${filePath}`, filePath, remote: false };
  }

  if (
    isServerlessHost(env) &&
    !opts?.dbFilePath &&
    !env.CALORIE_LOGGER_DB_PATH
  ) {
    throw new Error(VERCEL_DB_REQUIRED_ERROR);
  }

  if (opts?.dbFilePath) {
    const filePath = resolveOverrideFile(opts.dbFilePath);
    return { url: `file:${filePath}`, filePath, remote: false };
  }

  if (env.CALORIE_LOGGER_DB_PATH) {
    const filePath = resolveOverrideFile(env.CALORIE_LOGGER_DB_PATH);
    return { url: `file:${filePath}`, filePath, remote: false };
  }

  const filePath = path.join(process.cwd(), "data", "app.db");
  return { url: `file:${filePath}`, filePath, remote: false };
}
