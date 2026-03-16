import { NextResponse } from "next/server";
import {
  isLoginIdAvailable,
  sanitizeLoginId,
} from "@/lib/server/accountAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loginId = sanitizeLoginId(searchParams.get("loginId") ?? "");

  if (!loginId) {
    return NextResponse.json(
      { ok: false, error: "missing_login_id" },
      { status: 400 },
    );
  }

  try {
    const result = await isLoginIdAvailable(loginId);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_check_login_id";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
