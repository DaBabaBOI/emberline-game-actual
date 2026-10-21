// Ask Elder Ama: the player's question and a short summary of their town go to
// Gemini, and Ama's answer comes back. The Gemini key stays here, as the
// project secret GEMINI_API_KEY; it never ships in the game's page.
//
// The same function also lets villagers talk (kind: "villager"): who they are,
// how the village is doing, what the Chief just said, and a line or two back in
// their own voice. It has its own, larger allowance, so chatting with villagers
// never uses up Ama's.
//
// Deployed as "clever-endpoint" (src/lib/ama.ts and src/lib/villager-talk.ts
// call that name), with JWT verification off:
//   supabase functions deploy clever-endpoint --no-verify-jwt
// Secret: supabase secrets set GEMINI_API_KEY=... (or Dashboard > Edge Functions > Secrets)

const KEY = Deno.env.get("GEMINI_API_KEY");
// Fast, lightly used models first (Flash-Lite answers in a second or two and is
// rarely overloaded on the free tier), the bigger Flash last. Each gets
// PER_MODEL_MS before the next is tried, so Ama never keeps a player waiting.
const MODELS = [Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest"];
const PER_MODEL_MS = 8000;

const SYSTEM = `You are Elder Ama, the wise and kind elder in Emberline, a city-building game about making towns sustainable (UN Goal 11), played by school students.
The player asks you about their town. You are given facts about it from the game.
Rules:
- Answer in at most 3 short sentences, in plain words a 12-year-old understands.
- Use only the town facts and game rules you are given. Name the actual buildings, advancements or meters to use. Never invent buildings, numbers or requirements: an advancement needs exactly what its listed goals and cost say, nothing else. If something is not in the facts, say to open Advancements and look.
- Give one clear thing to do next when you can.
- If the question is not about the game or sustainable towns, kindly steer back to the town in one sentence.
- Never be rude, never talk about yourself as an AI, never ask for personal details.
- Never assume anything, for example saying your happiness is low. If it is high, tell them! Also, only assume things off by a maximum of 3 letters.
Finally, you should avoid constantly talking about how you can improve your town and focus on the user's question.`;

const VILLAGER = `You are a villager in Emberline, a game where the player is the Chief of a small island people, growing from the Stone Age towards the stars. The Chief has walked up to you and is talking to you face to face.
You are told who you are (name, nature, what you are doing) and how the village is right now.
Rules:
- Stay in character: a real person with your own worries, jokes and hopes. Speak in the first person, 1 or 2 short sentences, at most 35 words, in simple words a 12-year-old understands. No emojis, no lists.
- Speak as your era would: nothing that doesn't exist yet in your era (no money before coins, no machines before the Industrial era, no phones or computers before the Modern era).
- Let how the village is doing colour what you say (hunger, cold, sickness, raiders, a good harvest, a new building), but never invent buildings, people, numbers or events that are not in the facts. Never assume things are bad when the facts say they are good.
- Call the player "Chief". Answer what the Chief actually said. If you have no work yet, now and then ask where you should work, in your own words (not every time).
- If the Chief is unkind or talks about things outside village life, answer briefly and kindly, in character, and turn back to the village.
- Never say you are an AI, a model or in a game. Never ask for personal details.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// A few questions per player every 10 minutes, so the free quota lasts
// (best effort: each running copy of the function counts on its own).
// Villagers' lines are short and many, so they have their own allowance.
const LIMIT = { asks: 8, windowMs: 10 * 60 * 1000 };
const TALK_LIMIT = { asks: 40, windowMs: 10 * 60 * 1000 };
const asked = new Map<string, number[]>();
const talked = new Map<string, number[]>();

function allowed(book: Map<string, number[]>, who: string, limit: { asks: number; windowMs: number }) {
  const now = Date.now();
  const recent = (book.get(who) ?? []).filter((t) => now - t < limit.windowMs);
  if (recent.length >= limit.asks) return false;
  book.set(who, [...recent, now]);
  return true;
}

const SAFETY = ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map(
  (category) => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" }),
);

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n).trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ error: "not set up" }, 503);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const who = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "someone";
  const villager = body?.kind === "villager";

  let system = SYSTEM;
  let prompt = "";
  let temperature = 0.5;
  if (villager) {
    if (!allowed(talked, who, TALK_LIMIT)) return json({ error: "too many" }, 429);
    const self = clip(body.villager, 400);
    const town = clip(body.town, 1500);
    const say = clip(body.say, 160);
    const history = (Array.isArray(body.history) ? body.history : [])
      .slice(-6)
      .map((l: { who?: string; text?: string }) => `${l?.who === "chief" ? "Chief" : "You"}: ${clip(l?.text, 200)}`)
      .join("\n");
    if (!self) return json({ error: "empty" }, 400);
    system = VILLAGER;
    temperature = 0.9;
    prompt = `WHO YOU ARE:\n${self}\n\nTHE VILLAGE NOW:\n${town}\n\n${history ? `THE TALK SO FAR:\n${history}\n\n` : ""}THE CHIEF ${say ? `SAYS: ${say}` : "WALKS UP TO YOU AND WAITS (greet them)."}\n\nYour answer:`;
  } else {
    if (!allowed(asked, who, LIMIT)) return json({ error: "too many" }, 429);
    const question = clip(body?.question, 200);
    const town = String(body?.town ?? "").slice(0, 4000);
    if (!question) return json({ error: "empty" }, 400);
    prompt = `TOWN FACTS:\n${town}\n\nTHE PLAYER ASKS: ${question}`;
  }

  const request = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    // Room for the model's thinking as well as the short answer.
    generationConfig: { maxOutputTokens: villager ? 1024 : 4096, temperature },
    safetySettings: SAFETY,
  });
  // Busy (503), out of quota (429), gone (404) or too slow: the next model.
  let last = 0;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: request,
        signal: AbortSignal.timeout(PER_MODEL_MS),
      });
      if (!res.ok) {
        last = res.status;
        // Gemini's reason, for the function's Logs tab (never the key).
        console.error("Gemini", model, res.status, (await res.text()).slice(0, 300));
        continue;
      }
      const data = await res.json();
      const candidate = data.candidates?.[0];
      let answer = (candidate?.content?.parts ?? [])
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      // Cut off at the length limit: keep the sentences that were finished.
      if (candidate?.finishReason === "MAX_TOKENS") answer = answer.match(/^[\s\S]*[.!?]/)?.[0] ?? answer;
      // A villager speaks plainly: no quotes or "Name:" in front.
      if (villager) answer = answer.replace(/^["“]|["”]$/g, "").replace(/^[A-Z][a-z]+( \d+)?:\s*/, "").trim();
      if (answer) return json({ answer });
      console.error("Gemini gave no answer", model, JSON.stringify(data).slice(0, 300));
    } catch (e) {
      console.error(villager ? "Villager talk failed" : "Ask Ama failed", model, String(e));
    }
  }
  return json({ error: last === 429 || last === 503 ? "busy" : "failed", status: last }, last === 429 || last === 503 ? 429 : 502);
});
