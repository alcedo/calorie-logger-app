export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface AiNutrition {
  name: string;
  aliases: string[];
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export type ProviderId = "openai" | "codex" | "claude";

export type ProviderReason = "missing" | "api_key" | "error";

export interface ProviderAvailability {
  available: boolean;
  detail: string;
  reason?: ProviderReason;
  subscriptionType?: string | null;
  authMethod?: string;
}

export interface GenerateJsonRequest {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  /** Provider-specific model id. Omit to use the CLI/SDK default. */
  model?: string;
}

export interface ModelOptionDto {
  id: string;
  label: string;
}

export interface AiProvider {
  id: ProviderId;
  label: string;
  isAvailable(): Promise<ProviderAvailability>;
  generateJson<T>(req: GenerateJsonRequest): Promise<T>;
}

export type AiSelection = "auto" | ProviderId | "none";

export type BannerKind = "ok" | "none" | "api_key";

export interface AiLoginSessionDto {
  sessionId: string;
  provider: "claude" | "codex";
  loginUrl: string;
  userCode?: string;
  expiresAt: number;
  phase: "awaiting_user" | "completing" | "done" | "failed";
  error?: string;
}

export interface AiProviderStatusDto {
  id: ProviderId;
  available: boolean;
  detail: string;
  reason?: ProviderReason;
  subscriptionType?: string | null;
  authMethod?: string;
}

export interface AiStatusDto {
  aiAvailable: boolean;
  provider: ProviderId | null;
  providerLabel: string | null;
  selection: AiSelection | "invalid";
  providers: AiProviderStatusDto[];
  bannerKind: BannerKind;
  bannerMessage: string | null;
  logins: AiLoginSessionDto[];
  models: Record<ProviderId, string>;
  modelCatalog: Record<ProviderId, ModelOptionDto[]>;
  activeModel: string | null;
  activeModelLabel: string | null;
}
