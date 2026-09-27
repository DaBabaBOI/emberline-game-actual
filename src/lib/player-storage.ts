function key(code: string) {
  return `hacktrack:player:${code.toUpperCase()}`;
}

export function getStoredPlayerId(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function setStoredPlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(key(code), playerId);
  } catch {
    // ignore - worst case you just re-join with a new player row
  }
}
