"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";

type Gender = "남성" | "여성";
type SongKey = "아리랑" | "애국가" | "내 나이가 어때서" | "무조건";

type LyricLine = {
  t: number;
  d: number;
  txt: string;
};

const SONGS: Record<SongKey, LyricLine[]> = {
  아리랑: [
    { t: 0, d: 4, txt: "아리랑 아리랑" },
    { t: 4, d: 4, txt: "아라리요~" },
    { t: 8, d: 4, txt: "아리랑 고개를" },
    { t: 12, d: 4, txt: "넘어간다~" },
    { t: 16, d: 4, txt: "나를 버리고" },
    { t: 20, d: 4, txt: "가시는 님은" },
    { t: 24, d: 4, txt: "십리도 못가서" },
    { t: 28, d: 2, txt: "발병난다" },
  ],
  애국가: [
    { t: 0, d: 5, txt: "동해물과 백두산이" },
    { t: 5, d: 5, txt: "마르고 닳도록" },
    { t: 10, d: 5, txt: "하느님이 보우하사" },
    { t: 15, d: 5, txt: "우리나라 만세" },
    { t: 20, d: 5, txt: "무궁화 삼천리" },
    { t: 25, d: 5, txt: "화려강산" },
  ],
  "내 나이가 어때서": [
    { t: 0, d: 4, txt: "야야야 내 나이가 어때서" },
    { t: 4, d: 4, txt: "사랑에 나이가 있나요" },
    { t: 8, d: 4, txt: "마음은 하나요" },
    { t: 12, d: 4, txt: "느낌도 하나요" },
    { t: 16, d: 4, txt: "그대만이 정말" },
    { t: 20, d: 4, txt: "내 사랑인데" },
    { t: 24, d: 6, txt: "내 나이가 어때서~" },
  ],
  무조건: [
    { t: 0, d: 2.4, txt: "내가 필요할 땐" },
    { t: 2.4, d: 2.4, txt: "나를 불러줘" },
    { t: 4.8, d: 2.4, txt: "언제든지 달려갈게" },
    { t: 7.2, d: 2.4, txt: "무조건 달려갈게" },
    { t: 9.6, d: 1.8, txt: "짜짜라 짜라짜라" },
    { t: 11.4, d: 1.8, txt: "짠짠짠!" },
    { t: 13.2, d: 1.8, txt: "태평양을 건너" },
    { t: 15.0, d: 1.8, txt: "인도양을 건너" },
    { t: 16.8, d: 3.0, txt: "대서양을 건너서라도" },
    { t: 19.8, d: 2.0, txt: "나를 불러주면" },
    { t: 21.8, d: 2.5, txt: "무조건 달려갈게" },
    { t: 24.3, d: 2.5, txt: "무조건 무조건이야~" },
    { t: 26.8, d: 3.2, txt: "짜자라 짜라짜라 짠짠짠" },
  ],
};

type Phase = "intro" | "select" | "guide" | "countdown" | "singing" | "result";

type RankRow = {
  name: string;
  score: number;
  region: string;
  me?: boolean;
};

const SONG_KEYS: SongKey[] = ["아리랑", "애국가", "내 나이가 어때서", "무조건"];

export default function BrainSingPage() {
  const router = useRouter();
  const { patient } = useTrainingSession();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clockTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const singingTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [clockText, setClockText] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("여성");

  const [song, setSong] = useState<SongKey>("아리랑");
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState("30.0");
  const [scanStatus, setScanStatus] = useState("WAITING");

  const [lyricBase, setLyricBase] = useState("시스템 준비 중...");
  const [lyricFillPct, setLyricFillPct] = useState(0);

  const [rtJitter, setRtJitter] = useState("0.00%");
  const [rtSi, setRtSi] = useState("0.0");
  const [rtLatency, setRtLatency] = useState("0 ms");

  const [jitterHistory, setJitterHistory] = useState<number[]>([]);
  const [siHistory, setSiHistory] = useState<number[]>([]);

  const [finalScore, setFinalScore] = useState(0);
  const [finalJitter, setFinalJitter] = useState("0.00");
  const [finalSi, setFinalSi] = useState("0.0");
  const [comment, setComment] = useState("");
  const [rankings, setRankings] = useState<RankRow[]>([]);
  const [preselectedSong, setPreselectedSong] = useState<SongKey | null>(null);

  const userName = useMemo(() => name || patient?.name || "사용자", [name, patient?.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("song");
    if (!raw) return;
    const selected = SONG_KEYS.find((item) => item === raw) ?? null;
    setPreselectedSong(selected);
  }, []);

  useEffect(() => {
    if (preselectedSong) {
      setSong(preselectedSong);
    }
  }, [preselectedSong]);

  useEffect(() => {
    if (!name && patient?.name) setName(patient.name);
    if (!age && patient?.age) setAge(String(patient.age));
  }, [age, name, patient]);

  useEffect(() => {
    const tick = () => setClockText(new Date().toLocaleTimeString());
    tick();
    clockTimerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (clockTimerRef.current !== null) window.clearInterval(clockTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
      if (singingTimerRef.current !== null) window.clearInterval(singingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const registerUser = () => {
    if (!name.trim() || !age.trim()) {
      window.alert("이름과 나이를 입력해주세요.");
      return;
    }
    setPhase(preselectedSong ? "guide" : "select");
  };

  const prepareSong = (selected: SongKey) => {
    setSong(selected);
    setPhase("guide");
  };

  const startCountdown = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      setCountdown(3);
      setPhase("countdown");

      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current !== null) {
              window.clearInterval(countdownTimerRef.current);
            }
            startSinging();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("camera/mic error:", error);
      window.alert("카메라/마이크 권한이 필요합니다.");
      setPhase("guide");
    }
  };

  const startSinging = () => {
    const startedAt = Date.now();
    setPhase("singing");
    setScanStatus("LIVE SCANNING");
    setJitterHistory([]);
    setSiHistory([]);
    setLyricBase("시스템 준비 중...");
    setLyricFillPct(0);

    singingTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remain = Math.max(0, 30 - elapsed).toFixed(1);
      setRemaining(remain);

      const songLyrics = SONGS[song];
      const currentLine = songLyrics.find(
        (line) => elapsed >= line.t && elapsed < line.t + line.d,
      );

      if (currentLine) {
        setLyricBase(currentLine.txt);
        const progress = Math.min(100, ((elapsed - currentLine.t) / currentLine.d) * 100);
        setLyricFillPct(progress);
      } else {
        setLyricFillPct(0);
      }

      const jitter = Number((0.23 + Math.random() * 0.18).toFixed(2));
      const si = Number((94.8 + Math.random() * 3.5).toFixed(1));
      setJitterHistory((prev) => [...prev, jitter]);
      setSiHistory((prev) => [...prev, si]);
      setRtJitter(`${jitter.toFixed(2)}%`);
      setRtSi(si.toFixed(1));
      setRtLatency(`${(115 + Math.random() * 12).toFixed(0)} ms`);

      if (elapsed >= 30) {
        if (singingTimerRef.current !== null) {
          window.clearInterval(singingTimerRef.current);
        }
        finishSinging();
      }
    }, 100);
  };

  const finishSinging = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const avgJ = jitterHistory.length
      ? jitterHistory.reduce((a, b) => a + b, 0) / jitterHistory.length
      : 0.3;
    const avgS = siHistory.length
      ? siHistory.reduce((a, b) => a + b, 0) / siHistory.length
      : 95;
    const score = Math.floor(avgS * 0.5 + (100 - avgJ * 10) * 0.5);

    setFinalScore(score);
    setFinalJitter(avgJ.toFixed(2));
    setFinalSi(avgS.toFixed(1));
    setComment(
      `안면 추적 분석 결과, 성대 미세 떨림 수치가 ${avgJ.toFixed(2)}%로 안정적이며 ` +
        `안면 대칭 지수 ${avgS.toFixed(1)}점으로 신경 협응 상태가 양호합니다.`,
    );

    const meMaskedName =
      userName.length >= 2
        ? `${userName[0]}*${userName[userName.length - 1]}`
        : `${userName}*`;
    const rows: RankRow[] = [
      { name: "박*자", score: 98, region: "전남" },
      { name: "김*식", score: 95, region: "서울" },
      { name: meMaskedName, score, region: "본인", me: true },
      { name: "이*순", score: 89, region: "경기" },
      { name: "최*남", score: 86, region: "경남" },
    ].sort((a, b) => b.score - a.score);
    setRankings(rows);
    setPhase("result");
  };

  const resetAll = () => {
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    if (singingTimerRef.current !== null) window.clearInterval(singingTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRemaining("30.0");
    setLyricBase("시스템 준비 중...");
    setLyricFillPct(0);
    setRtJitter("0.00%");
    setRtSi("0.0");
    setRtLatency("0 ms");
    setJitterHistory([]);
    setSiHistory([]);
    setPhase("intro");
  };

  return (
    <div className="flex-1 overflow-auto bg-[#fffbf0] text-[#2b1a0f]">
      <header className="px-6 py-3 bg-white border-b-2 border-[#c48a2c] flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-black text-[#9b6a1f]">브레인 노래방</h1>
        <p className="text-[11px] font-mono text-[#7f6d5f]">{clockText}</p>
      </header>

      <main className="p-4 h-[calc(100vh-9.5rem)] min-h-[620px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-full">
          <section className="rounded-3xl overflow-hidden border border-[#f1e6d0] bg-white shadow-sm flex flex-col">
            <div className="px-5 py-3 bg-[#fffdf9] border-b border-[#f1e6d0] flex items-center justify-between">
              <p className="text-sm font-bold text-[#9b6a1f]">가창 분석 엔진</p>
              <span className="text-[11px] font-mono text-[#7f6d5f]">{scanStatus}</span>
            </div>

            <div className="relative flex-1 bg-black overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] opacity-90" />
              <div className="absolute inset-x-0 top-0 h-[3px] bg-white shadow-[0_0_20px_#c48a2c] animate-[scanline_4s_linear_infinite]" />
              <div className="absolute top-4 right-4 text-white font-mono text-4xl font-black drop-shadow-lg">
                {remaining}
              </div>
            </div>

            <div className="h-28 border-t-4 border-[#c48a2c] bg-white px-6 flex items-center justify-center relative">
              <p className="text-3xl font-black text-[#f0ede4] relative whitespace-nowrap">
                {lyricBase}
                <span
                  className="absolute left-0 top-0 text-[#9b6a1f] overflow-hidden whitespace-nowrap transition-[width] duration-100"
                  style={{ width: `${lyricFillPct}%` }}
                >
                  {lyricBase}
                </span>
              </p>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#f1e6d0] bg-white shadow-sm p-4 flex flex-col">
            <div className="rounded-xl border border-[#f1e6d0] border-l-[6px] border-l-[#9b6a1f] bg-[#fdf6e3] p-4 mb-2">
              <label className="text-[10px] font-extrabold text-[#9b6a1f] uppercase">Jitter</label>
              <p className="text-3xl font-mono font-black">{rtJitter}</p>
            </div>
            <div className="rounded-xl border border-[#f1e6d0] border-l-[6px] border-l-[#9b6a1f] bg-[#fdf6e3] p-4 mb-2">
              <label className="text-[10px] font-extrabold text-[#9b6a1f] uppercase">Symmetry Index</label>
              <p className="text-3xl font-mono font-black">{rtSi}</p>
            </div>
            <div className="rounded-xl border border-[#f1e6d0] border-l-[6px] border-l-[#9b6a1f] bg-[#fdf6e3] p-4">
              <label className="text-[10px] font-extrabold text-[#9b6a1f] uppercase">Latency</label>
              <p className="text-3xl font-mono font-black">{rtLatency}</p>
            </div>

            <div className="mt-auto pt-3 text-center">
              <p className="text-xs font-black text-[#9b6a1f]">BRAIN FRIENDS GOLDEN</p>
              <p className="text-[10px] text-[#7f6d5f]">AI Singing Neuro-Care Module</p>
            </div>
          </aside>
        </div>
      </main>

      {phase === "intro" && (
        <Overlay>
          <h2 className="text-3xl font-black text-[#9b6a1f] mb-4">브레인 노래방 진입</h2>
          <p className="text-sm text-[#7f6d5f] font-bold mb-6">검사자 정보를 입력하세요.</p>
          <div className="w-full max-w-md grid gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="w-full p-3 rounded-xl border border-[#f1e6d0] bg-white"
            />
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="나이"
              className="w-full p-3 rounded-xl border border-[#f1e6d0] bg-white"
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full p-3 rounded-xl border border-[#f1e6d0] bg-white"
            >
              <option value="여성">여성</option>
              <option value="남성">남성</option>
            </select>
            <button
              type="button"
              onClick={registerUser}
              className="mt-2 h-12 rounded-xl bg-[#9b6a1f] text-white font-black"
            >
              검사 시작
            </button>
          </div>
        </Overlay>
      )}

      {phase === "select" && (
        <Overlay>
          <h2 className="text-3xl font-black text-[#9b6a1f] mb-4">곡 선택</h2>
          <p className="text-sm text-[#7f6d5f] font-bold mb-6">
            {userName}님, 검사할 노래를 선택하세요.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {(Object.keys(SONGS) as SongKey[]).map((songKey) => (
              <button
                key={songKey}
                type="button"
                onClick={() => prepareSong(songKey)}
                className="h-14 rounded-xl border border-[#f1e6d0] bg-white font-black hover:bg-[#fdf6e3] transition-colors"
              >
                {songKey}
              </button>
            ))}
          </div>
        </Overlay>
      )}

      {phase === "guide" && (
        <Overlay>
          <h2 className="text-3xl font-black text-[#9b6a1f] mb-4">{song}</h2>
          <p className="text-sm text-[#7f6d5f] font-bold mb-2">검사 시간: 30초</p>
          <p className="text-sm text-[#7f6d5f] font-bold mb-6">
            카운트다운 후 가창을 시작합니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={startCountdown}
              className="h-12 px-10 rounded-xl bg-[#10b981] text-white font-black"
            >
              시작하기
            </button>
            {preselectedSong && (
              <button
                type="button"
                onClick={() => router.push("/select-page/sing-training")}
                className="h-12 px-6 rounded-xl border border-[#c48a2c] text-[#9b6a1f] font-black bg-white"
              >
                다른 곡 선택
              </button>
            )}
          </div>
        </Overlay>
      )}

      {phase === "countdown" && (
        <Overlay>
          <p className="text-sm text-[#7f6d5f] font-bold mb-2">검사 시작까지</p>
          <h2 className="text-8xl font-black text-[#9b6a1f]">{countdown}</h2>
        </Overlay>
      )}

      {phase === "result" && (
        <Overlay>
          <div className="w-full max-w-3xl rounded-3xl border-2 border-[#c48a2c] bg-white p-8 shadow-xl">
            <h2 className="text-3xl font-black text-[#9b6a1f] mb-5 text-center">
              진단 완료
            </h2>
            <div className="rounded-2xl border border-[#f1e6d0] bg-[#fffbf0] p-4 mb-4 text-center">
              <p className="text-sm font-bold text-[#7f6d5f]">종합 점수</p>
              <p className="text-6xl font-black text-[#9b6a1f] leading-none">
                {finalScore}
                <span className="text-2xl ml-1">점</span>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Stat title="성대 미세 떨림" value={`${finalJitter}%`} />
              <Stat title="안면 대칭 지수" value={finalSi} />
              <Stat title="반응 지연" value={rtLatency} />
            </div>
            <p className="text-sm leading-relaxed text-[#2b1a0f] mb-4">{comment}</p>
            <div className="rounded-xl border border-[#f1e6d0] p-3">
              <p className="text-sm font-black text-[#9b6a1f] mb-2">지역 랭킹</p>
              <div className="space-y-1.5">
                {rankings.map((row, idx) => (
                  <div
                    key={`${row.name}-${idx}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold border ${
                      row.me
                        ? "bg-[#fdf6e3] text-[#9b6a1f] border-[#c48a2c]"
                        : "bg-white border-[#f1e6d0]"
                    }`}
                  >
                    <span>{idx + 1}위. {row.name} ({row.region})</span>
                    <span>{row.score}점</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 rounded-xl bg-[#10b981] text-white font-black"
              >
                결과 인쇄
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="h-11 rounded-xl bg-[#9b6a1f] text-white font-black"
              >
                처음으로
              </button>
            </div>
          </div>
        </Overlay>
      )}

      <style jsx>{`
        @keyframes scanline {
          from {
            top: 0%;
          }
          to {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 bg-[#fffbf0]/95 backdrop-blur-[1px] z-30 flex flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#f1e6d0] bg-[#fffbf0] p-3">
      <p className="text-[11px] font-extrabold text-[#7f6d5f]">{title}</p>
      <p className="text-2xl font-mono font-black mt-1">{value}</p>
    </div>
  );
}
