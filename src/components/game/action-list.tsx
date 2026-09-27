import type { ActionOption } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ActionListProps {
  actions: ActionOption[];
  onSelect: (action: ActionOption) => void;
  disabled?: boolean;
}

export function ActionList({ actions, onSelect, disabled }: ActionListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map((action) => (
        <Card key={action.id}>
          <CardContent className="flex h-full flex-col gap-3">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
