/**
 * 음성 인식 및 발음 분석 시스템
 * - OpenAI Whisper API 사용 (95.2% 정확도 목표)
 * - 테스트 모드(Mock Data) 지원
 * - 발음 정확도 측정 및 안면 대칭성 연동
 */

export interface SpeechAnalysisResult {
  transcript: string; // 인식된 텍스트
  confidence: number; // 0-1 신뢰도
  pronunciationScore: number; // 0-100 발음 점수
  duration: number; // ms
  audioLevel: number; // dB
}

export interface PronunciationMetrics {
  syllableAccuracy: number; // 음절 정확도
  tonalAccuracy: number; // 음조 정확도
  speedRatio: number; // 발화 속도 (정상 대비)
  clarityScore: number; // 명료도
}

// ============================================================================
// 1. 음성 녹음 관리
// ============================================================================

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;

  async startRecording(onAudioLevel?: (level: number) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      if (onAudioLevel) {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        source.connect(this.analyser);
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const updateLevel = () => {
          if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            const sum = this.dataArray.reduce((a, b) => a + b, 0);
            const average = sum / this.dataArray.length;
            const dB = 20 * Math.log10(average / 255);
            onAudioLevel(Math.max(0, dB + 60));
          }
          this.animationId = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm",
      });

      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.start();
    } catch (error) {
      console.error("녹음 시작 실패:", error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder가 초기화되지 않았습니다."));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.cleanup();
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    if (this.audioContext) this.audioContext.close();
    if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

// ============================================================================
// 2. Whisper API 연동 (서버 프록시 사용)
// ============================================================================

export class WhisperTranscriber {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(
    audioBlob: Blob,
  ): Promise<{ text: string; confidence: number }> {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("language", "ko");
      formData.append("response_format", "verbose_json");

      // 실제 서버의 Proxy API 호출
      const response = await fetch("/api/proxy/whisper", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`분석 실패: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const confidence =
        data.segments?.reduce(
          (sum: number, seg: any) => sum + (seg.no_speech_prob || 0),
          0,
        ) / (data.segments?.length || 1);

      return {
        text: data.text,
        confidence: 1 - confidence,
      };
    } catch (error) {
      console.error("Whisper 전사 실패:", error);
      throw error;
    }
  }
}

// ============================================================================
// 3. 발음 정확도 측정 로직
// ============================================================================

export class PronunciationAnalyzer {
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str1.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
  }

  private decomposeHangul(text: string): string {
    const cho = [
      "ㄱ",
      "ㄲ",
      "ㄴ",
      "ㄷ",
      "ㄸ",
      "ㄹ",
      "ㅁ",
      "ㅂ",
      "ㅃ",
      "ㅅ",
      "ㅆ",
      "ㅇ",
      "ㅈ",
      "ㅉ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
    ];
    const jung = [
      "ㅏ",
      "ㅐ",
      "ㅑ",
      "ㅒ",
      "ㅓ",
      "ㅔ",
      "ㅕ",
      "ㅖ",
      "ㅗ",
      "ㅘ",
      "ㅙ",
      "ㅚ",
      "ㅛ",
      "ㅜ",
      "ㅝ",
      "ㅞ",
      "ㅟ",
      "ㅠ",
      "ㅡ",
      "ㅢ",
      "ㅣ",
    ];
    const jong = [
      "",
      "ㄱ",
      "ㄲ",
      "ㄳ",
      "ㄴ",
      "ㄴㅈ",
      "ㄶ",
      "ㄷ",
      "ㄹ",
      "ㄹㄱ",
      "ㄹㅁ",
      "ㄹㅂ",
      "ㄹㅅ",
      "ㄹㅌ",
      "ㄹㅍ",
      "ㄹㅎ",
      "ㅁ",
      "ㅂ",
      "ㅂㅅ",
      "ㅅ",
      "ㅆ",
      "ㅇ",
      "ㅈ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ",
    ];

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) - 0xac00;
      if (code >= 0 && code <= 11171) {
        result +=
          cho[Math.floor(code / 588)] +
          jung[Math.floor((code % 588) / 28)] +
          jong[code % 28];
      } else {
        result += text[i];
      }
    }
    return result;
  }

  analyzePronunciation(expected: string, actual: string): PronunciationMetrics {
    const expectedClean = expected.replace(/\s+/g, "").toLowerCase();
    const actualClean = actual.replace(/\s+/g, "").toLowerCase();

    const syllableAccuracy = this.calculateSimilarity(
      this.decomposeHangul(expectedClean),
      this.decomposeHangul(actualClean),
    );
    const wordAccuracy = this.calculateSimilarity(expectedClean, actualClean);
    const speedRatio =
      expectedClean.length === 0
        ? 1
        : actualClean.length / expectedClean.length;
    const clarityScore = syllableAccuracy * 0.6 + wordAccuracy * 0.4;

    return {
      syllableAccuracy,
      tonalAccuracy: wordAccuracy,
      speedRatio,
      clarityScore,
    };
  }
}

// ============================================================================
// 4. 통합 분석기 (테스트 모드 전환 로직 포함)
// ============================================================================

export class SpeechAnalyzer {
  private recorder: AudioRecorder;
  private transcriber: WhisperTranscriber;
  private pronunciationAnalyzer: PronunciationAnalyzer;
  private startTime: number = 0;

  constructor(whisperApiKey: string) {
    this.recorder = new AudioRecorder();
    this.transcriber = new WhisperTranscriber(whisperApiKey);
    this.pronunciationAnalyzer = new PronunciationAnalyzer();
  }

  async startAnalysis(onAudioLevel?: (level: number) => void): Promise<void> {
    this.startTime = Date.now();
    await this.recorder.startRecording(onAudioLevel);
  }

  async stopAnalysis(expectedText: string): Promise<SpeechAnalysisResult> {
    const audioBlob = await this.recorder.stopRecording();
    const duration = Date.now() - this.startTime;

    // 🔹 환경변수에 따른 모드 스위칭
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    if (isDevMode) {
      console.log(
        "🛠️ [TEST MODE] OpenAI를 호출하지 않고 가짜 데이터를 반환합니다.",
      );
      // 분석 중인 느낌을 주기 위한 지연 시간
      await new Promise((resolve) => setTimeout(resolve, 1200));

      return {
        transcript: expectedText, // 사용자가 완벽하게 발음한 것으로 가정
        confidence: 0.99,
        pronunciationScore: 100,
        duration,
        audioLevel: 45,
      };
    }

    // 🔹 실제 모드: OpenAI Whisper API 호출 (유료)
    const { text, confidence } = await this.transcriber.transcribe(audioBlob);
    const metrics = this.pronunciationAnalyzer.analyzePronunciation(
      expectedText,
      text,
    );

    return {
      transcript: text,
      confidence,
      pronunciationScore: Math.round(metrics.clarityScore),
      duration,
      audioLevel: 0,
    };
  }
}
