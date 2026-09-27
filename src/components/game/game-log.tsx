export interface GameLogProps {
  entries: string[];
}

export function GameLog({ entries }: GameLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      {[...entries]
        .reverse()
        .slice(0, 5)
        .map((entry, index) => (
          <p key={index}>{entry}</p>
        ))}
    </div>
  );
}
