import { cn } from "@/lib/utils";

export interface MeterBarProps {
  label: string;
  value: number;
  goal: number;
  color: string;
  icon?: string;
}

export function MeterBar({ label, value, goal, color, icon }: MeterBarProps) {
  const isCritical = value <= 20;
  const isAtGoal = value >= goal;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          {icon ? <span>{icon}</span> : null}
          {label}
        </span>
        <span
          className={cn(
            "text-muted-foreground",
            isCritical && "font-semibold text-red-600",
            isAtGoal && "font-semibold text-emerald-600",
          )}
        >
          {value}/100
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isCritical ? "bg-red-500" : color,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
