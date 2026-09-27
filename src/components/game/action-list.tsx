import type { ActionOption } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionListProps {
  actions: ActionOption[];
  onSelect: (action: ActionOption) => void;
  onPreview?: (action: ActionOption | null) => void;
  disabled?: boolean;
}

export function ActionList({
  actions,
  onSelect,
  onPreview,
  disabled,
}: ActionListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map((action) => (
        <Card
          key={action.id}
          className="overflow-hidden"
          onMouseEnter={() => onPreview?.(action)}
          onMouseLeave={() => onPreview?.(null)}
        >
          <CardContent className="flex h-full gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl",
                action.color,
              )}
            >
              {action.icon}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <p className="font-medium">{action.label}</p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => onSelect(action)}
                className="mt-auto self-start"
              >
                Choose
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
