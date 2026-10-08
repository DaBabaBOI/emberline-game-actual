// A fingerprint of a saved game, so an edited save can be told apart from one
// the game itself wrote. The game seals every save (in this browser and in the
// cloud) and checks the seal when it loads one; a save that was changed by
// hand (or by a save editor) no longer matches, and is marked as edited:
// it plays on, but can't post to the leaderboard or the speedrun records.
//
// This keeps honest records honest; it can't stop someone determined who
// reads this code, since everything runs in the player's own browser.

const SALT = "emberline:ember-from-the-first-fire:v1";

// The same text for the same game, whatever order its keys come back in (the
// cloud reorders them) and however its numbers are written.
function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(Math.round(value * 1e6) / 1e6) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined && k !== "_seal")
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return "null";
}

// cyrb53: a small, fast 53-bit string hash.
function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function sealOf(data: unknown): string {
  const text = canonical(data);
  return `${cyrb53(SALT + text, 7)}${cyrb53(text + SALT, 11)}`;
}

export function sealMatches(data: unknown, seal: string | null | undefined): boolean {
  return !!seal && sealOf(data) === seal;
}
