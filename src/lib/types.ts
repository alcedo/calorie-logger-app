export interface EntryDto {
  id: number;
  date: string;
  loggedAt: string;
  foodId: number | null;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  rawInput: string | null;
}

export interface MacroTotalsDto {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface GoalsDto {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodDto {
  id: number;
  name: string;
  normalizedName: string;
  aliases: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  source: "seed" | "ai" | "user";
  createdAt: string;
}

export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
