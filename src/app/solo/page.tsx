import { Container } from "@/components/layout/container";
import { CityGame } from "@/components/game/city-game";

export default function SoloPage() {
  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solo</h1>
        <p className="text-muted-foreground">
          Get every meter to 75+ before you run out of turns.
        </p>
      </div>
      <CityGame />
    </Container>
  );
}
