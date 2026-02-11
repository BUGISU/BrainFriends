import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    if (isDevMode) {
      return NextResponse.json({
        text: "테스트 모드 응답입니다.",
        segments: [{ no_speech_prob: 0.01 }],
      });
    }

    const formData = await req.formData();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "서버 API 키 누락" }, { status: 500 });
    }

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "서버 내부 오류" }, { status: 500 });
  }
}
