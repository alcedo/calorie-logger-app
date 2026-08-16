import { db } from "../db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SETTING_AI_PROVIDER = "ai_provider";
export const SETTING_CLAUDE_OAUTH_TOKEN = "claude_oauth_token";
export const SETTING_AI_CLAUDE_MODEL = "ai_claude_model";
export const SETTING_AI_CODEX_MODEL = "ai_codex_model";
export const SETTING_AI_OPENAI_MODEL = "ai_openai_model";

export function getSetting(key: string): string | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })
    .run();
}

export function deleteSetting(key: string): void {
  db.delete(settings).where(eq(settings.key, key)).run();
}
