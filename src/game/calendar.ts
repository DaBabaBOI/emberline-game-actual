// Realistic time (a joke mode): the calendar runs in real time. A new game
// starts in 50,000 BCE on today's date and time, and the year only turns over
// after a real year. Pure: the caller passes the real time in.
import { ERAS, formatYear } from "./content";
import type { GameState } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

// Northern-hemisphere seasons by month.
export function seasonOf(month: number) {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

export function realCalendar(state: GameState, now: number) {
  const from = state.realTimeFrom ?? now;
  const date = new Date(now);
  const years = Math.floor((now - from) / YEAR_MS);
  const year = ERAS[0].startYear + years;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getDate()} ${MONTHS[date.getMonth()]} ${formatYear(year)}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    season: seasonOf(date.getMonth()),
    // Real years until the Ancient era's first year.
    yearsToNext: ERAS[1].startYear - year,
  };
}

// The time of day (0 midnight – 1) on the player's real clock.
export function realTimeOfDay(now: number) {
  const d = new Date(now);
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
}
