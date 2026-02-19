// src/app/api/proxy/stt/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    // 테스트 모드: STT API 호출 없이 고정 응답
    if (isDevMode) {
      return NextResponse.json({
        text: "테스트 모드 응답입니다.",
        segments: [{ no_speech_prob: 0.01 }],
      });
    }

    // 1. FormData 및 API 키 확인
    const formData = await req.formData();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ 서버 환경변수에 OPENAI_API_KEY가 없습니다.");
      return NextResponse.json({ error: "서버 API 키 누락" }, { status: 500 });
    }

    // 2. OpenAI API 호출
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      },
    );

    const data = await response.json();

    // 성공/실패 여부에 상관없이 그대로 클라이언트에 전달
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // :any를 붙여서 타입 에러 방지
    console.error("❌ Whisper Proxy Error:", error);
    return NextResponse.json(
      { error: "서버 내부 오류", details: error.message },
      { status: 500 },
    );
  }
}
