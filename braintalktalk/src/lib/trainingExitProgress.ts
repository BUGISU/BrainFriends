"use client";

const EXIT_PROGRESS_KEY = "kwab_training_exit_progress";

type ExitProgressByPlace = Record<
  string,
  {
    currentStep: number;
    completedThroughStep: number;
    updatedAt: number;
  }
>;

export function saveTrainingExitProgress(place: string, currentStep: number) {
  if (typeof window === "undefined") return;

  const safeStep = Number.isFinite(currentStep)
    ? Math.max(1, Math.floor(currentStep))
    : 1;

  let existing: ExitProgressByPlace = {};
  try {
    const raw = localStorage.getItem(EXIT_PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        existing = parsed as ExitProgressByPlace;
      }
    }
  } catch {
    existing = {};
  }

  existing[place] = {
    currentStep: safeStep,
    completedThroughStep: Math.max(0, safeStep - 1),
    updatedAt: Date.now(),
  };

  localStorage.setItem(EXIT_PROGRESS_KEY, JSON.stringify(existing));
}

export function getTrainingExitProgress(place: string): {
  currentStep: number;
  completedThroughStep: number;
  updatedAt: number;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(EXIT_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExitProgressByPlace;
    const progress = parsed?.[place];
    if (!progress) return null;
    return progress;
  } catch {
    return null;
  }
}
