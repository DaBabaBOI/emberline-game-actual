import { Container } from "@/components/layout/container";
import { RoomView } from "@/components/multiplayer/room-view";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Room {code.toUpperCase()}
      </h1>
      <RoomView code={code.toUpperCase()} />
    </Container>
  );
}
