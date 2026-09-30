"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "emberline-accessibility-settings";

type ThemeMode = "light" | "dark";
type FontMode = "pixel" | "sans" | "serif";

type AccessibilitySettings = {
  theme: ThemeMode;
  font: FontMode;
  highContrast: boolean;
  largeText: boolean;
};

const defaultSettings: AccessibilitySettings = {
  theme: "light",
  font: "pixel",
  highContrast: false,
  largeText: false,
};

function applyAccessibilitySettings(next: AccessibilitySettings) {
  const root = document.documentElement;

  root.dataset.theme = next.theme;
  root.dataset.font = next.font;
  root.classList.toggle("high-contrast", next.highContrast);
  root.classList.toggle("large-text", next.largeText);

  const saved = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, saved);
}

function getInitialSettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      font: parsed.font === "sans" || parsed.font === "serif" ? parsed.font : "pixel",
      highContrast: Boolean(parsed.highContrast),
      largeText: Boolean(parsed.largeText),
    };
  } catch {
    return defaultSettings;
  }
}

export function AccessibilitySettings() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }
    return getInitialSettings();
  });

  useEffect(() => {
    applyAccessibilitySettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!panelRef.current || !target) return;
      if (!panelRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    applyAccessibilitySettings(next);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="accessibility-settings-panel"
        aria-label={open ? "Close accessibility settings" : "Open accessibility settings"}
        onClick={() => setOpen((value) => !value)}
        className="pixel-btn font-pixel bg-[#f8e7bd] px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-[#f5d98b]"
      >
        {open ? "Close" : "Settings"}
      </button>

      {open && (
        <div
          id="accessibility-settings-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Accessibility settings"
          className="pixel-panel w-[min(90vw,22rem)] bg-[#fbf7ef]/95 p-4 backdrop-blur-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-pixel text-lg font-bold">Accessibility</div>
            <button
              type="button"
              aria-label="Close accessibility settings"
              onClick={() => setOpen(false)}
              className="pixel-btn bg-white px-2 py-1 text-xs font-semibold hover:bg-amber-50"
            >
              X
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>Dark mode</span>
              <input
                aria-label="Toggle dark mode"
                type="checkbox"
                checked={settings.theme === "dark"}
                onChange={(event) =>
                  updateSetting("theme", event.target.checked ? "dark" : "light")
                }
                className="h-5 w-5 accent-emerald-600"
              />
            </label>

            <div>
              <div className="mb-1 font-medium">Font</div>
              <div className="grid grid-cols-3 gap-2">
                {(["pixel", "sans", "serif"] as FontMode[]).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => updateSetting("font", font)}
                    className={
                      "pixel-btn px-2 py-2 text-xs font-semibold " +
                      (settings.font === font ? "bg-amber-200" : "bg-white hover:bg-amber-50")
                    }
                  >
                    {font === "pixel" ? "Pixel" : font === "sans" ? "Sans" : "Serif"}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span>High contrast</span>
              <input
                aria-label="Toggle high contrast mode"
                type="checkbox"
                checked={settings.highContrast}
                onChange={(event) => updateSetting("highContrast", event.target.checked)}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span>Larger text</span>
              <input
                aria-label="Toggle larger text"
                type="checkbox"
                checked={settings.largeText}
                onChange={(event) => updateSetting("largeText", event.target.checked)}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
