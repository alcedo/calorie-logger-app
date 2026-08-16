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

  beforeEach(() => {
    createMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = ORIGINAL_KEY;
    if (ORIGINAL_MODEL === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = ORIGINAL_MODEL;
  });

  it("aiAvailable reflects OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    let mod = await import("./ai");
    expect(mod.aiAvailable()).toBe(false);

    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mod = await import("./ai");
    expect(mod.aiAvailable()).toBe(true);
  });

  it("parseMealText returns filtered items from OpenAI JSON", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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

  it("parseMealText returns [] when content is missing", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const { parseMealText } = await import("./ai");
    await expect(parseMealText("whatever")).resolves.toEqual([]);
  });

  it("parseMealText throws AiUnavailableError without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const { parseMealText, AiUnavailableError } = await import("./ai");
    await expect(parseMealText("2 eggs")).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("lookupNutrition returns parsed nutrition", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const nutrition = {
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
      choices: [{ message: { content: JSON.stringify(nutrition) } }],
    });
    const { lookupNutrition } = await import("./ai");
    await expect(lookupNutrition("dragon fruit")).resolves.toEqual(nutrition);
  });

  it("lookupNutrition throws when content is empty", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    createMock.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const { lookupNutrition } = await import("./ai");
    await expect(lookupNutrition("mystery")).rejects.toThrow(
      /No nutrition data returned/
    );
  });
});
