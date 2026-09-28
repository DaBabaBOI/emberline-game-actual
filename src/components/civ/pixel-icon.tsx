import { memo } from "react";
import { PALETTE, SPRITES, type IconId } from "@/game/sprites";

export const PixelIcon = memo(function PixelIcon({
  name,
  size = 20,
  className,
  title,
}: {
  name: IconId;
  size?: number;
  className?: string;
  title?: string;
}) {
  const rows = SPRITES[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rows.flatMap((row, y) =>
        Array.from(row).map((ch, x) =>
          ch === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />
          ),
        ),
      )}
    </svg>
  );
});
