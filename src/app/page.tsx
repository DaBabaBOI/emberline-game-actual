import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="font-medium">Solo</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Play by yourself, no one else needed.
            </p>
            <Link href="/solo">
              <Button>Play solo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="font-medium">Multiplayer</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Create or join a room and take turns with your team.
            </p>
            <Link href="/multiplayer">
              <Button variant="secondary">Play multiplayer</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
