// The parts of the project page (../index.html) that need JavaScript:
//   1. The accessibility settings (dark mode, font, high contrast, larger text).
//   2. The "What's new" bar.
//
// The game saves the same settings under the same name
// (src/components/accessibility-settings.tsx), so a choice made on this page
// carries into the game, and back.

const SETTINGS_KEY = "emberline-accessibility-settings";

// 1. Accessibility settings --------------------------------------------------

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return {
      theme: saved.theme === "dark" ? "dark" : "light",
      font: saved.font === "sans" || saved.font === "serif" ? saved.font : "pixel",
      highContrast: Boolean(saved.highContrast),
      largeText: Boolean(saved.largeText),
    };
  } catch {
    // Nothing saved yet, or the browser blocks storage.
    return { theme: "light", font: "pixel", highContrast: false, largeText: false };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage is blocked: the choice still works until the page is closed.
  }
}

// Marks the <html> tag; style.css (section 8) does the rest.
function applySettings(settings) {
  const html = document.documentElement;
  html.dataset.theme = settings.theme;
  html.dataset.font = settings.font;
  html.classList.toggle("high-contrast", settings.highContrast);
  html.classList.toggle("large-text", settings.largeText);
}

// Right away, before the page is drawn, so it never flashes the wrong colours.
applySettings(loadSettings());

function setUpSettings() {
  const toggle = document.querySelector(".settings-toggle");
  const panel = document.getElementById("settings-panel");
  const dark = panel.querySelector('input[name="dark"]');
  const highContrast = panel.querySelector('input[name="highContrast"]');
  const largeText = panel.querySelector('input[name="largeText"]');
  const fontButtons = panel.querySelectorAll(".font-choices button");

  // Show the saved choices in the panel.
  function showSettings(settings) {
    dark.checked = settings.theme === "dark";
    highContrast.checked = settings.highContrast;
    largeText.checked = settings.largeText;
    for (const button of fontButtons) {
      button.setAttribute("aria-pressed", String(button.value === settings.font));
    }
  }

  function change(key, value) {
    const settings = { ...loadSettings(), [key]: value };
    saveSettings(settings);
    applySettings(settings);
    showSettings(settings);
  }

  function open() {
    // Read them again: the game may have changed them in another tab.
    showSettings(loadSettings());
    panel.hidden = false;
    toggle.textContent = "Close";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close accessibility settings");
  }

  function close() {
    panel.hidden = true;
    toggle.textContent = "Settings";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open accessibility settings");
  }

  toggle.addEventListener("click", () => (panel.hidden ? open() : close()));
  panel.querySelector(".settings-close").addEventListener("click", () => {
    close();
    toggle.focus();
  });

  // Escape, or a click anywhere else, closes it too.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      close();
      toggle.focus();
    }
  });
  document.addEventListener("mousedown", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) close();
  });

  dark.addEventListener("change", () => change("theme", dark.checked ? "dark" : "light"));
  highContrast.addEventListener("change", () => change("highContrast", highContrast.checked));
  largeText.addEventListener("change", () => change("largeText", largeText.checked));
  for (const button of fontButtons) {
    button.addEventListener("click", () => change("font", button.value));
  }
}

// 2. "What's new" -------------------------------------------------------------
// The list is in site/updates.js, made from src/game/updates.ts (newest first).

// "2026-10-01" -> "1 Oct 2026"
function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function setUpUpdates() {
  const updates = window.EMBERLINE_UPDATES;
  const bar = document.querySelector(".updates-bar");
  if (!Array.isArray(updates) || updates.length === 0) return; // the bar stays hidden

  // The newest change, on the bar itself.
  const latest = updates[0];
  bar.querySelector(".updates-date").textContent = formatDate(latest.date);
  bar.querySelector(".updates-latest").textContent = latest.items[0];

  // Every change, day by day, shown by the "What's new" button.
  const list = bar.querySelector(".updates-list");
  for (const update of updates) {
    const day = document.createElement("div");
    day.className = "updates-day";
    const date = document.createElement("p");
    date.textContent = formatDate(update.date);
    const items = document.createElement("ul");
    for (const item of update.items) {
      const line = document.createElement("li");
      line.textContent = item;
      items.append(line);
    }
    day.append(date, items);
    list.append(day);
  }

  const toggle = bar.querySelector(".updates-toggle");
  toggle.addEventListener("click", () => {
    list.hidden = !list.hidden;
    toggle.textContent = list.hidden ? "What's new" : "Hide";
    toggle.setAttribute("aria-expanded", String(!list.hidden));
  });

  bar.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  setUpSettings();
  setUpUpdates();
});
