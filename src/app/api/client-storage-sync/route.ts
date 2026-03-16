import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/server/accountAuth";
import {
  deleteTrainingDraftForAuthenticatedUser,
  upsertTrainingDraftForAuthenticatedUser,
} from "@/lib/server/trainingDraftsDb";
import { recordTrainingUsageEvent } from "@/lib/server/trainingUsageEventsDb";
import {
  isManagedStorageKey,
  type ManagedStorageScope,
} from "@/lib/storage/managedStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthorizedScope(rawScope: unknown, rawKey: unknown) {
  const scope =
    String(rawScope) === "session" ? ("session" as const) : ("local" as const);
  const key = String(rawKey ?? "");
  if (!isManagedStorageKey(scope, key)) {
    throw new Error("unsupported_storage_key");
  }
  return { scope, key };
}

async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function PUT(req: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    const { scope, key } = getAuthorizedScope(body.scope, body.key);
    const value = String(body.value ?? "");
    await upsertTrainingDraftForAuthenticatedUser(
      token,
      scope as ManagedStorageScope,
      key,
      value,
    );
    await recordTrainingUsageEvent(token, {
      eventType: "training_draft_updated",
      pagePath: "/api/client-storage-sync",
      payload: {
        scope,
        key,
        valueLength: value.length,
      },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_sync_storage";
    const status =
      message === "unauthorized"
        ? 401
        : message === "unsupported_storage_key" || message === "invalid_payload"
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    const { scope, key } = getAuthorizedScope(body.scope, body.key);
    await deleteTrainingDraftForAuthenticatedUser(token, scope, key);
    await recordTrainingUsageEvent(token, {
      eventType: "training_draft_deleted",
      pagePath: "/api/client-storage-sync",
      payload: {
        scope,
        key,
      },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_delete_storage";
    const status =
      message === "unauthorized"
        ? 401
        : message === "unsupported_storage_key" || message === "invalid_payload"
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
