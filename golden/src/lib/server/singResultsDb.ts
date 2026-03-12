import { createHash } from "crypto";
import type { PatientProfile } from "@/lib/patientStorage";
import { getDbPool } from "@/lib/server/postgres";

export type PersistedSingResult = {
  song: string;
  userName: string;
  score: number;
  finalJitter: string;
  finalSi: string;
  rtLatency: string;
  comment: string;
  rankings: Array<{
    name: string;
    score: number;
    region: string;
    me?: boolean;
  }>;
  completedAt: number;
  governance?: {
    catalogVersion: string;
    analysisVersion: string;
    requirementIds: string[];
    failureModes: string[];
  };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  const chars = hex.split("");
  chars[12] = "5";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function buildPatientIdentity(patient: PatientProfile): string {
  return [
    patient.name.trim(),
    patient.birthDate ?? "",
    patient.gender,
    patient.phone ?? "",
    patient.language ?? "ko",
  ].join("|");
}

function buildPatientCode(patientId: string): string {
  return `PT-${patientId.slice(0, 8).toUpperCase()}`;
}

function parseLatencyMs(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseMetric(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export async function saveSingResultToDatabase(params: {
  patient: PatientProfile;
  result: PersistedSingResult;
}) {
  const { patient, result } = params;
  const pool = getDbPool();
  const client = await pool.connect();

  const patientIdentity = buildPatientIdentity(patient);
  const patientId = deterministicUuid(`patient:${patientIdentity}`);
  const patientCode = buildPatientCode(patientId);
  const sessionId = deterministicUuid(
    `session:${patientId}:sing:${result.completedAt}:${result.song}`,
  );
  const resultId = deterministicUuid(`sing-result:${sessionId}`);
  const completedAt = new Date(result.completedAt);
  const latencyMs = parseLatencyMs(result.rtLatency);
  const jitter = parseMetric(result.finalJitter);
  const facialSymmetry = parseMetric(result.finalSi);

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO patients (
          patient_id,
          patient_code,
          name,
          birth_date,
          sex,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (patient_id) DO UPDATE
        SET
          patient_code = EXCLUDED.patient_code,
          name = EXCLUDED.name,
          birth_date = EXCLUDED.birth_date,
          sex = EXCLUDED.sex
      `,
      [
        patientId,
        patientCode,
        patient.name.trim(),
        patient.birthDate || null,
        patient.gender || "U",
      ],
    );

    await client.query(
      `
        INSERT INTO clinical_sessions (
          session_id,
          patient_id,
          training_type,
          started_at,
          completed_at,
          algorithm_version,
          catalog_version,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (session_id) DO UPDATE
        SET
          completed_at = EXCLUDED.completed_at,
          algorithm_version = EXCLUDED.algorithm_version,
          catalog_version = EXCLUDED.catalog_version,
          status = EXCLUDED.status
      `,
      [
        sessionId,
        patientId,
        "sing-training",
        completedAt,
        completedAt,
        result.governance?.analysisVersion ?? "brain-sing-unknown",
        result.governance?.catalogVersion ?? null,
        "completed",
      ],
    );

    await client.query(
      `
        INSERT INTO sing_results (
          result_id,
          session_id,
          song_key,
          score,
          jitter,
          facial_symmetry,
          latency_ms,
          comment,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (result_id) DO UPDATE
        SET
          song_key = EXCLUDED.song_key,
          score = EXCLUDED.score,
          jitter = EXCLUDED.jitter,
          facial_symmetry = EXCLUDED.facial_symmetry,
          latency_ms = EXCLUDED.latency_ms,
          comment = EXCLUDED.comment
      `,
      [
        resultId,
        sessionId,
        result.song,
        result.score,
        jitter,
        facialSymmetry,
        latencyMs,
        result.comment,
      ],
    );

    await client.query("COMMIT");

    return {
      patientId,
      patientCode,
      sessionId,
      resultId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
