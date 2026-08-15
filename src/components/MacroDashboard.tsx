import type { GoalsDto, MacroTotalsDto } from "@/lib/types";

function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const size = 148;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten > goal;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={over ? "text-rose-500" : "text-emerald-400"}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">
          {Math.round(eaten)}
        </span>
        <span className="text-xs text-zinc-400">/ {Math.round(goal)} kcal</span>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-400">
          <span className="font-semibold text-zinc-100">
            {Math.round(value)}g
          </span>{" "}
          / {Math.round(goal)}g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: "width 600ms ease" }}
        />
      </div>
    </div>
  );
}

export function MacroDashboard({
  totals,
  goals,
}: {
  totals: MacroTotalsDto;
  goals: GoalsDto;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <CalorieRing eaten={totals.calories} goal={goals.calories} />
        <div className="flex w-full flex-1 flex-col gap-4">
          <MacroBar
            label="Protein"
            value={totals.protein}
            goal={goals.protein}
            color="bg-sky-400"
          />
          <MacroBar
            label="Carbs"
            value={totals.carbs}
            goal={goals.carbs}
            color="bg-amber-400"
          />
          <MacroBar
            label="Fat"
            value={totals.fat}
            goal={goals.fat}
            color="bg-fuchsia-400"
          />
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>Fiber {Math.round(totals.fiber)}g</span>
            <span>Sugar {Math.round(totals.sugar)}g</span>
            <span>Sodium {Math.round(totals.sodium)}mg</span>
          </div>
        </div>
      </div>
    </section>
  );
}
