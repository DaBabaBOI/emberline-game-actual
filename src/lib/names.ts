// Names and chat are shown to other players (and this is played in schools),
// so slurs are never allowed. Letters swapped for look-alike digits and
// symbols, and spaces or dots between letters, don't get round it.

const LOOKALIKE: Record<string, string> = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t", "8": "b", "9": "g" };

// Lower case, look-alikes swapped back, everything but letters dropped.
function squash(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((c) => LOOKALIKE[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1");
}

// Slurs, as squashed text: matched anywhere in a name.
const ANYWHERE = [/(?<!s)n+[ie]+gg+(?:a|ah|uh|az|as|er|ur|uz|let)|n+i+g+a+[sz]?$/, /f+a+g+(?:s|got|ot|it)?$|f+a+g+g?o+t/, /r+e+t+a+r+d/, /k+i+k+e/, /w+e+t+b+a+c+k/, /t+r+a+n+n+(?:y|ie)/];
// These are also parts of ordinary words (raccoon, spice), so only whole words count.
const WHOLE = [/^c+o+o+n+s?$/, /^s+p+i+c+k?s?$/, /^g+o+o+k+s?$/, /^p+a+k+i+s?$/, /^c+h+i+n+k+s?$/, /^d+y+k+e+s?$/];

export function isOffensive(text: string): boolean {
  if (ANYWHERE.some((re) => re.test(squash(text)))) return true;
  return text.split(/\s+/).some((w) => WHOLE.some((re) => re.test(squash(w))));
}

// What to show instead of a name that isn't allowed.
export const HIDDEN_NAME = "A nation";
