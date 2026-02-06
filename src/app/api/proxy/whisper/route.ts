import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 🔹 개발 모드 확인 (환경변수)
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    if (isDevMode) {
      console.log(
        "🛠️ [SERVER PROXY] 테스트 모드 작동 중: OpenAI 요청을 차단합니다.",
      );
      // 테스트 모드일 때는 가짜 응답을 즉시 반환
      return NextResponse.json({
        text: "테스트 모드입니다. 음성 인식이 정상 작동하는 것처럼 시뮬레이션합니다.",
        segments: [{ no_speech_prob: 0.01 }],
      });
    }

    const formData = await req.formData();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ 서버 환경변수에 API 키가 없습니다.");
      return NextResponse.json(
        { error: "API Key is missing" },
        { status: 500 },
      );
    }

    // 🔹 실제 모드: OpenAI Whisper API 호출
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

    // OpenAI에서 에러를 보냈을 경우 처리
    if (!response.ok) {
      console.error("❌ OpenAI API Error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Whisper Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
