import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => {
  class OpenAI {
    chat = {
      completions: {
        create: createMock,
      },
    };
  }
  return { default: OpenAI };
});

describe("ai module", () => {
  const ORIGINAL_KEY = process.env.OPENAI_API_KEY;
  const ORIGINAL_MODEL = process.env.OPENAI_MODEL;
  const ORIGINAL_PROVIDER = process.env.AI_PROVIDER;

  beforeEach(async () => {
    createMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
    vi.resetModules();
    const { clearAiStatusCache } = await import("./ai");
    clearAiStatusCache();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = ORIGINAL_KEY;
    if (ORIGINAL_MODEL === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = ORIGINAL_MODEL;
    if (ORIGINAL_PROVIDER === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = ORIGINAL_PROVIDER;
  });

  it("does not treat OPENAI_API_KEY as available under auto", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { getAiStatus } = await import("./ai");
    const status = await getAiStatus();
    expect(status.aiAvailable).toBe(false);
    expect(status.provider).toBeNull();
  });

  it("enables OpenAI only when AI_PROVIDER=openai and a key is set", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_PROVIDER = "openai";
    const { getAiStatus } = await import("./ai");
    const status = await getAiStatus();
    expect(status.aiAvailable).toBe(true);
    expect(status.provider).toBe("openai");
  });

  it("parseMealText returns filtered items from OpenAI JSON", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_PROVIDER = "openai";
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { name: "egg", quantity: 2, unit: "serving" },
                { name: "  ", quantity: 1, unit: "serving" },
              ],
            }),
          },
        },
      ],
    });
    const { parseMealText } = await import("./ai");
    await expect(parseMealText("2 eggs")).resolves.toEqual([
      { name: "egg", quantity: 2, unit: "serving" },
    ]);
  });

  it("parseMealText throws when OpenAI content is missing", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_PROVIDER = "openai";
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const { parseMealText } = await import("./ai");
    await expect(parseMealText("whatever")).rejects.toThrow(/no content/i);
  });

  it("parseMealText throws AiUnavailableError without a provider", async () => {
    const { parseMealText, AiUnavailableError } = await import("./ai");
    await expect(parseMealText("2 eggs")).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("lookupNutrition returns a map of parsed nutrition", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_PROVIDER = "openai";
    const nutrition = {
      query: "dragon fruit",
      name: "Dragon Fruit",
      aliases: ["pitaya"],
      servingSize: 1,
      servingUnit: "medium (200 g)",
      calories: 120,
      protein: 2,
      carbs: 26,
      fat: 0.5,
      fiber: 5,
      sugar: 18,
      sodium: 2,
    };
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ foods: [nutrition] }) } }],
    });
    const { lookupNutrition } = await import("./ai");
    const map = await lookupNutrition(["dragon fruit"]);
    expect(map.get("dragon fruit")).toEqual({
      name: "Dragon Fruit",
      aliases: ["pitaya"],
      servingSize: 1,
      servingUnit: "medium (200 g)",
      calories: 120,
      protein: 2,
      carbs: 26,
      fat: 0.5,
      fiber: 5,
      sugar: 18,
      sodium: 2,
    });
  });

  it("lookupNutrition throws when content is empty", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_PROVIDER = "openai";
    createMock.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const { lookupNutrition } = await import("./ai");
    await expect(lookupNutrition(["mystery"])).rejects.toThrow(/no content/i);
  });
});
