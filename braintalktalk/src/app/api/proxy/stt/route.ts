import { NextResponse } from "next/server";

// 서버 환경에서만 실행되도록 보장
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    // 1. 테스트 모드 처리
    if (isDevMode) {
      return NextResponse.json({
        text: "테스트 모드입니다. 정상 작동 중!",
        segments: [{ no_speech_prob: 0.01 }],
      });
    }

    // 2. FormData 받기
    const formData = await req.formData();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ 서버에 API 키가 없습니다.");
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // 3. OpenAI 호출
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
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("❌ Whisper 서버 에러:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
