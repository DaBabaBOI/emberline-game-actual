import { Container } from "@/components/layout/container";
import { CreateJoinPanel } from "@/components/multiplayer/create-join-panel";

export default function MultiplayerPage() {
  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Multiplayer</h1>
        <p className="text-muted-foreground">
          Everyone builds their own city, taking turns. First to get all
          meters above 75 wins the room.
        </p>
      </div>
      <CreateJoinPanel />
    </Container>
  );
}
