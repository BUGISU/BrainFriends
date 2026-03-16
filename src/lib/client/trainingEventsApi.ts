type TrainingEventPayload = {
  eventType: string;
  eventStatus?: "success" | "failed" | "skipped" | "rejected";
  trainingType?: string | null;
  stepNo?: number | null;
  pagePath?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown>;
};

export async function logTrainingEvent(event: TrainingEventPayload) {
  await fetch("/api/training-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
    keepalive: true,
  });
}
