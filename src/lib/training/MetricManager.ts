// src/lib/training/MetricManager.ts

/**
 * 실시간 학습 지표를 관리하고 수집하는 엔진 클래스
 * 추후 이 클래스의 데이터를 기반으로 최종 결과를 생성합니다.
 */
export class MetricManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;

  // 최종 결과 리포트를 위해 데이터를 누적 저장할 수도 있습니다.
  public history = {
    speechLevels: [] as number[],
    latencyLogs: [] as number[],
  };

  /** 마이크 세팅 및 분석 시작 */
  async startMicrophone(onUpdate: (speech: number) => void) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);

      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const update = () => {
        if (!this.analyser) return;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, Math.floor((average / 128) * 100));

        this.history.speechLevels.push(level); // 데이터 수집
        onUpdate(level);
        this.animationId = requestAnimationFrame(update);
      };
      update();
    } catch (err) {
      console.error("Microphone Error:", err);
    }
  }

  /** 임의의 시스템 지표 생성 (추후 실제 API 연동 가능) */
  getRandomMetric(min: number, max: number, current: number) {
    const change = Math.random() > 0.5 ? 0.01 : -0.01;
    return parseFloat(
      Math.max(min, Math.min(max, current + change)).toFixed(2)
    );
  }

  /** 리소스 해제 */
  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.audioContext) this.audioContext.close();
  }
}
