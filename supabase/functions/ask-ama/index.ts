// Ask Elder Ama: the player's question and a short summary of their town go to
// Gemini, and Ama's answer comes back. The Gemini key stays here, as the
// project secret GEMINI_API_KEY; it never ships in the game's page.
//
// Deployed as "clever-endpoint" (src/lib/ama.ts calls that name), with JWT
// verification off: supabase functions deploy clever-endpoint --no-verify-jwt
// Secret: supabase secrets set GEMINI_API_KEY=... (or Dashboard > Edge Functions > Secrets)

const KEY = Deno.env.get("GEMINI_API_KEY");
// "gemini-flash-latest" always points at Google's current Flash model.
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";

const SYSTEM = `You are Elder Ama, the wise and kind elder in Emberline, a city-building game about making towns sustainable (UN Goal 11), played by school students.
The player asks you about their town. You are given facts about it from the game.
Rules:
- Answer in at most 3 short sentences, in plain words a 12-year-old understands.
- Use only the town facts and game rules you are given. Name the actual buildings, advancements or meters to use. Never invent buildings or numbers.
- Give one clear thing to do next when you can.
- If the question is not about the game or sustainable towns, kindly steer back to the town in one sentence.
- Never be rude, never talk about yourself as an AI, never ask for personal details.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// A few questions per player every 10 minutes, so the free quota lasts
// (best effort: each running copy of the function counts on its own).
const LIMIT = { asks: 8, windowMs: 10 * 60 * 1000 };
const asked = new Map<string, number[]>();

const SAFETY = ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map(
  (category) => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" }),
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ error: "not set up" }, 503);

  const who = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "someone";
  const now = Date.now();
  const recent = (asked.get(who) ?? []).filter((t) => now - t < LIMIT.windowMs);
  if (recent.length >= LIMIT.asks) return json({ error: "too many" }, 429);
  asked.set(who, [...recent, now]);

  let question = "";
  let town = "";
  try {
    const body = await req.json();
    question = String(body.question ?? "").slice(0, 200).trim();
    town = String(body.town ?? "").slice(0, 4000);
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!question) return json({ error: "empty" }, 400);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: `TOWN FACTS:\n${town}\n\nTHE PLAYER ASKS: ${question}` }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.5 },
        safetySettings: SAFETY,
      }),
    });
    if (!res.ok) {
      // Gemini's reason, for the function's Logs tab (never the key).
      console.error("Gemini", res.status, (await res.text()).slice(0, 500));
      return json({ error: res.status === 429 ? "busy" : "failed", status: res.status }, res.status === 429 ? 429 : 502);
    }
    const data = await res.json();
    const answer = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!answer) console.error("Gemini gave no answer", JSON.stringify(data).slice(0, 500));
    return answer ? json({ answer }) : json({ error: "no answer" }, 502);
  } catch (e) {
    console.error("Ask Ama failed", String(e));
    return json({ error: "failed" }, 502);
  }
});
