import { MAX_TURNS, actionById } from "@/lib/game";
import { cn } from "@/lib/utils";

export interface IslandBoardProps {
  builds: string[];
  size?: "lg" | "sm";
}

export function IslandBoard({ builds, size = "lg" }: IslandBoardProps) {
  const slots = Array.from({ length: MAX_TURNS }, (_, i) => builds[i] ?? null);
  const tile = size === "lg" ? "h-12 w-12 text-2xl" : "h-8 w-8 text-base";

  return (
    <div className="rounded-3xl bg-gradient-to-b from-sky-200 to-sky-100 p-4 dark:from-sky-950 dark:to-sky-900">
      <div className="rounded-[2rem] bg-gradient-to-b from-lime-300 via-emerald-300 to-emerald-400 p-4 shadow-inner dark:from-lime-800 dark:via-emerald-800 dark:to-emerald-900">
        <div className="grid grid-cols-5 gap-2">
          {slots.map((buildId, i) => {
            const action = buildId ? actionById(buildId) : null;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-50/60 dark:border-emerald-300/20 dark:bg-emerald-900/40",
                  tile,
                  action && "border-solid border-transparent shadow-sm",
                  action && action.color,
                )}
                title={action?.label}
              >
                {action ? action.icon : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
