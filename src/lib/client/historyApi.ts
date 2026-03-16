import type { TrainingHistoryEntry } from "@/lib/kwab/SessionManager";

export async function fetchMyHistoryEntries() {
  const response = await fetch("/api/history/me", {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "failed_to_load_history");
  }

  return {
    entries: Array.isArray(payload.entries)
      ? (payload.entries as TrainingHistoryEntry[])
      : [],
  };
}
