import { db, ensureDb } from "../db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SETTING_AI_PROVIDER = "ai_provider";
export const SETTING_CLAUDE_OAUTH_TOKEN = "claude_oauth_token";
export const SETTING_AI_CLAUDE_MODEL = "ai_claude_model";
export const SETTING_AI_CODEX_MODEL = "ai_codex_model";
export const SETTING_AI_OPENAI_MODEL = "ai_openai_model";

export async function getSetting(key: string): Promise<string | undefined> {
  try {
    await ensureDb();
  } catch {
    return undefined;
  }
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureDb();
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })
    .run();
}

export async function deleteSetting(key: string): Promise<void> {
  await ensureDb();
  await db.delete(settings).where(eq(settings.key, key)).run();
}
