// src/lib/training/MetricEngine.ts
export class MetricEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // ✅ 컴포넌트의 호출부와 이름을 동일하게 맞춤
  async startAudioAnalysis(onUpdate: (level: number) => void) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      const loop = () => {
        if (!this.analyser) return;
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        // 0~100 사이 값으로 변환
        const level = Math.min(100, Math.floor((avg / 128) * 100));

        onUpdate(level);
        requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      console.error("오디오 분석 시작 실패:", err);
    }
  }

  stop() {
    this.audioContext?.close();
  }
}
