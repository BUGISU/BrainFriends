import { NextResponse } from "next/server";
import type { PatientProfile } from "@/lib/patientStorage";
import {
  saveSingResultToDatabase,
  type PersistedSingResult,
} from "@/lib/server/singResultsDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  patient?: PatientProfile | null;
  result?: PersistedSingResult | null;
};

function isValidPatient(patient: PatientProfile | null | undefined): patient is PatientProfile {
  return Boolean(patient?.name?.trim() && patient?.gender && patient?.age);
}

function isValidResult(result: PersistedSingResult | null | undefined): result is PersistedSingResult {
  return Boolean(result?.song && Number.isFinite(Number(result?.score)) && result?.completedAt);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!isValidPatient(body.patient)) {
      return NextResponse.json(
        { ok: false, error: "invalid_patient_payload" },
        { status: 400 },
      );
    }

    if (!isValidResult(body.result)) {
      return NextResponse.json(
        { ok: false, error: "invalid_result_payload" },
        { status: 400 },
      );
    }

    const saved = await saveSingResultToDatabase({
      patient: body.patient,
      result: body.result,
    });

    return NextResponse.json({ ok: true, saved });
  } catch (error: any) {
    console.error("[sing-results] failed to persist", error);
    const status = error?.message === "missing_database_url" ? 500 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "failed_to_persist_sing_result",
      },
      { status },
    );
  }
}
