import { Container } from "@/components/layout/container";
import { CityGame } from "@/components/game/city-game";

export default function Home() {
  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Hacktrack</h1>
        <p className="text-muted-foreground">
          Keep education, energy and sustainability alive while building a
          city that actually lasts. SDG-11.
        </p>
      </div>
      <CityGame />
    </Container>
  );
}
