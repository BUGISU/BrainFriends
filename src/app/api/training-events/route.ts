import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/server/accountAuth";
import { getAuthenticatedSessionContext } from "@/lib/server/accountAuth";
import {
  listTrainingUsageEventsForAllPatients,
  listTrainingUsageEventsForAuthenticatedUser,
  recordTrainingUsageEvent,
  type RecordTrainingUsageEventInput,
} from "@/lib/server/trainingUsageEventsDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePayload(body: any): RecordTrainingUsageEventInput {
  const eventType = String(body?.eventType ?? "").trim();
  if (!eventType) {
    throw new Error("invalid_event_payload");
  }

  return {
    eventType,
    eventStatus: body?.eventStatus,
    trainingType: body?.trainingType ? String(body.trainingType) : null,
    stepNo:
      body?.stepNo == null || body?.stepNo === ""
        ? null
        : Number(body.stepNo),
    pagePath: body?.pagePath ? String(body.pagePath) : null,
    sessionId: body?.sessionId ? String(body.sessionId) : null,
    payload:
      body?.payload && typeof body.payload === "object" ? body.payload : {},
  };
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "200");
  const scope = searchParams.get("scope") || "me";

  try {
    if (scope === "all") {
      const context = await getAuthenticatedSessionContext(token);
      if (!context || context.userRole !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }
    const result =
      scope === "all"
        ? await listTrainingUsageEventsForAllPatients(token, limit)
        : await listTrainingUsageEventsForAuthenticatedUser(token, limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_load_training_events";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_event_payload" }, { status: 400 });
  }

  try {
    const payload = normalizePayload(body);
    await recordTrainingUsageEvent(token, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_record_training_event";
    const status =
      message === "unauthorized"
        ? 401
        : message === "invalid_event_payload"
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
