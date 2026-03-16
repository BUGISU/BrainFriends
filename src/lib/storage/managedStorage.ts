export type ManagedStorageScope = "local" | "session";

const LOCAL_KEYS = new Set([
  "kwab_training_session",
  "kwab_training_exit_progress",
  "step1_data",
  "step1_data__meta",
  "step2_recorded_audios",
  "step2_recorded_audios__meta",
  "step3_data",
  "step3_data__meta",
  "step4_recorded_audios",
  "step4_recorded_audios__meta",
  "step5_recorded_data",
  "step5_recorded_data__meta",
  "step6_recorded_data",
  "step6_recorded_data__meta",
]);

const SESSION_KEYS = new Set([
  "btt.trainingMode",
  "btt.trialMode",
  "brain-sing-result",
]);

const SESSION_PREFIXES = ["step3_protocol:", "step6_questions:"];

export function isManagedStorageKey(
  scope: ManagedStorageScope,
  key: string,
) {
  if (!key) return false;
  if (scope === "local") {
    return LOCAL_KEYS.has(key);
  }

  if (SESSION_KEYS.has(key)) {
    return true;
  }

  return SESSION_PREFIXES.some((prefix) => key.startsWith(prefix));
}
