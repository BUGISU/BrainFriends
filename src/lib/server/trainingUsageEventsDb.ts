import { randomUUID } from "crypto";
import { getAuthenticatedSessionContext } from "@/lib/server/accountAuth";
import { getDbPool } from "@/lib/server/postgres";

export type TrainingUsageEventStatus =
  | "success"
  | "failed"
  | "skipped"
  | "rejected";

export type RecordTrainingUsageEventInput = {
  eventType: string;
  eventStatus?: TrainingUsageEventStatus;
  trainingType?: string | null;
  stepNo?: number | null;
  pagePath?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown> | null;
};

export type TrainingUsageTimelineEvent = {
  usageEventId: string;
  patientName?: string;
  patientCode?: string;
  loginId?: string | null;
  patientPseudonymId?: string;
  eventType: string;
  eventStatus: TrainingUsageEventStatus;
  trainingType: string | null;
  stepNo: number | null;
  pagePath: string | null;
  sessionId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

let ensureUsageEventsTablePromise: Promise<void> | null = null;

async function ensureTrainingUsageEventsTable() {
  if (!ensureUsageEventsTablePromise) {
    ensureUsageEventsTablePromise = (async () => {
      const pool = getDbPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS training_usage_events (
          usage_event_id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patient_pii(patient_id) ON DELETE CASCADE,
          patient_pseudonym_id VARCHAR(64) NOT NULL REFERENCES patient_pseudonym_map(patient_pseudonym_id),
          event_type VARCHAR(100) NOT NULL,
          event_status VARCHAR(20) NOT NULL DEFAULT 'success',
          training_type VARCHAR(50),
          step_no INTEGER,
          page_path VARCHAR(200),
          session_id UUID,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      ensureUsageEventsTablePromise = null;
      throw error;
    });
  }

  await ensureUsageEventsTablePromise;
}

export async function recordTrainingUsageEvent(
  sessionToken: string,
  input: RecordTrainingUsageEventInput,
) {
  const context = await getAuthenticatedSessionContext(sessionToken);
  if (!context) {
    throw new Error("unauthorized");
  }

  await ensureTrainingUsageEventsTable();

  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO training_usage_events (
        usage_event_id,
        user_id,
        patient_id,
        patient_pseudonym_id,
        event_type,
        event_status,
        training_type,
        step_no,
        page_path,
        session_id,
        payload,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        CASE WHEN $10::text IS NULL OR $10::text = '' THEN NULL ELSE $10::uuid END,
        $11::jsonb,
        NOW()
      )
    `,
    [
      randomUUID(),
      context.userId,
      context.patientId,
      context.patientPseudonymId,
      input.eventType,
      input.eventStatus ?? "success",
      input.trainingType ?? null,
      input.stepNo ?? null,
      input.pagePath ?? null,
      input.sessionId ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );
}

export async function listTrainingUsageEventsForAuthenticatedUser(
  sessionToken: string,
  limit = 200,
) {
  const context = await getAuthenticatedSessionContext(sessionToken);
  if (!context) {
    throw new Error("unauthorized");
  }

  await ensureTrainingUsageEventsTable();

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 500)
    : 200;

  const pool = getDbPool();
  const result = await pool.query(
    `
      SELECT
        usage_event_id::text AS usage_event_id,
        event_type,
        event_status,
        training_type,
        step_no,
        page_path,
        session_id::text AS session_id,
        payload,
        created_at
      FROM training_usage_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [context.userId, safeLimit],
  );

  const events: TrainingUsageTimelineEvent[] = result.rows.map((row: any) => ({
    usageEventId: String(row.usage_event_id),
    eventType: String(row.event_type),
    eventStatus: String(row.event_status) as TrainingUsageEventStatus,
    trainingType: row.training_type ? String(row.training_type) : null,
    stepNo: row.step_no == null ? null : Number(row.step_no),
    pagePath: row.page_path ? String(row.page_path) : null,
    sessionId: row.session_id ? String(row.session_id) : null,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return {
    patient: context.patient,
    userId: context.userId,
    patientId: context.patientId,
    patientPseudonymId: context.patientPseudonymId,
    events,
  };
}

export async function listTrainingUsageEventsForAllPatients(
  sessionToken: string,
  limit = 500,
) {
  const context = await getAuthenticatedSessionContext(sessionToken);
  if (!context) {
    throw new Error("unauthorized");
  }

  await ensureTrainingUsageEventsTable();

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 2000)
    : 500;

  const pool = getDbPool();
  const result = await pool.query(
    `
      SELECT
        tue.usage_event_id::text AS usage_event_id,
        tue.patient_pseudonym_id,
        pii.full_name,
        pii.patient_code,
        au.login_id,
        tue.event_type,
        tue.event_status,
        tue.training_type,
        tue.step_no,
        tue.page_path,
        tue.session_id::text AS session_id,
        tue.payload,
        tue.created_at
      FROM training_usage_events tue
      JOIN patient_pii pii ON pii.patient_id = tue.patient_id
      LEFT JOIN app_users au ON au.patient_id = tue.patient_id
      ORDER BY tue.created_at DESC
      LIMIT $1
    `,
    [safeLimit],
  );

  const events: TrainingUsageTimelineEvent[] = result.rows.map((row: any) => ({
    usageEventId: String(row.usage_event_id),
    patientName: String(row.full_name),
    patientCode: String(row.patient_code),
    loginId: row.login_id ? String(row.login_id) : null,
    patientPseudonymId: String(row.patient_pseudonym_id),
    eventType: String(row.event_type),
    eventStatus: String(row.event_status) as TrainingUsageEventStatus,
    trainingType: row.training_type ? String(row.training_type) : null,
    stepNo: row.step_no == null ? null : Number(row.step_no),
    pagePath: row.page_path ? String(row.page_path) : null,
    sessionId: row.session_id ? String(row.session_id) : null,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return {
    requestedBy: {
      userId: context.userId,
      patientId: context.patientId,
      patientPseudonymId: context.patientPseudonymId,
      patientName: context.patient.name,
    },
    events,
  };
}
