import OpenAI from "openai";
import type {
  AiProvider,
  GenerateJsonRequest,
  ProviderAvailability,
} from "../types";

const FALLBACK_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY and AI_PROVIDER=openai.",
    );
  }
  if (!client) client = new OpenAI();
  return client;
}

export const openaiProvider: AiProvider = {
  id: "openai",
  label: "OpenAI API key",

  async isAvailable(): Promise<ProviderAvailability> {
    if (process.env.OPENAI_API_KEY) {
      return {
        available: true,
        detail: "OPENAI_API_KEY is set (paid, opt-in via AI_PROVIDER=openai)",
      };
    }
    return {
      available: false,
      detail:
        "OPENAI_API_KEY is not set. This provider is paid and only used when AI_PROVIDER=openai.",
      reason: "missing",
    };
  },

  async generateJson<T>(req: GenerateJsonRequest): Promise<T> {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: req.model || FALLBACK_MODEL,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: req.schemaName,
          strict: true,
          schema: req.schema as Record<string, unknown>,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`OpenAI returned no content for ${req.schemaName}`);
    }
    return JSON.parse(content) as T;
  },
};
