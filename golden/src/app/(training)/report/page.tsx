"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import { SessionManager, TrainingHistoryEntry } from "@/lib/kwab/SessionManager";

const STEP_META = [
  { key: "step1", label: "Step 1 Comprehension" },
  { key: "step2", label: "Step 2 Repetition" },
  { key: "step3", label: "Step 3 Matching" },
  { key: "step4", label: "Step 4 Fluency" },
  { key: "step5", label: "Step 5 Reading" },
  { key: "step6", label: "Step 6 Writing" },
] as const;

function ReportContent() {
  const router = useRouter();
  const { patient } = useTrainingSession();
  const [history, setHistory] = useState<TrainingHistoryEntry[]>([]);
  const [selected, setSelected] = useState<TrainingHistoryEntry | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!patient) {
      setHistory([]);
      setSelected(null);
      return;
    }
    const rows = SessionManager.getHistoryFor(patient as any).sort(
      (a, b) => b.completedAt - a.completedAt,
    );
    setHistory(rows);
    setSelected(rows[0] || null);
  }, [patient]);

  const playAudio = (url: string, id: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.onended = null;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      void audio.play();
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="h-16 px-6 border-b border-orange-100 flex items-center justify-between bg-white sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black flex items-center justify-center">
            R
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
              Report
            </p>
            <h1 className="text-lg font-black">Patient Report</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/select")}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-black hover:bg-slate-100 transition-colors"
        >
          Back to Select
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 lg:gap-6">
        <section className="bg-white border border-orange-100 rounded-2xl p-4">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
              Patient
            </p>
            <p className="text-sm font-bold text-slate-700">
              {patient?.name || "No Patient"}
            </p>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">
              No saved reports.
            </div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {history.map((row) => (
                <button
                  key={row.historyId}
                  type="button"
                  onClick={() => setSelected(row)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selected?.historyId === row.historyId
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-black text-slate-800">
                    {new Date(row.completedAt).toLocaleString("ko-KR")}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    Place: {row.place} · AQ {row.aq}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-orange-100 rounded-2xl p-4 md:p-5">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm font-bold text-slate-500">
              No report selected.
            </div>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-24">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-black text-slate-700">
                  {new Date(selected.completedAt).toLocaleString("ko-KR")}
                </p>
                <p className="text-sm font-bold text-slate-600 mt-1">
                  Patient: {selected.patientName} · Place: {selected.place} · AQ {selected.aq}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {STEP_META.map((s) => (
                  <div
                    key={s.key}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="text-[10px] font-black text-slate-500">{s.label}</p>
                    <p className="text-lg font-black text-slate-800 mt-1">
                      {Number(
                        selected.stepScores[
                          s.key as keyof typeof selected.stepScores
                        ] || 0,
                      )}
                      %
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {STEP_META.map((s) => {
                  const items = Array.isArray(
                    selected.stepDetails?.[
                      s.key as keyof typeof selected.stepDetails
                    ],
                  )
                    ? (selected.stepDetails[
                        s.key as keyof typeof selected.stepDetails
                      ] as any[])
                    : [];

                  return (
                    <div
                      key={`detail-${s.key}`}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-black text-slate-700">
                          {s.label} Details ({items.length})
                        </p>
                      </div>

                      {items.length === 0 ? (
                        <div className="p-3 text-xs font-bold text-slate-400">
                          No records
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-2">
                          {items.map((it: any, idx: number) => {
                            const pid = `${s.key}-${idx}`;
                            return (
                              <div
                                key={pid}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <p className="text-[10px] font-black text-slate-400 mb-1">
                                  #{idx + 1}
                                </p>
                                <p className="text-xs font-bold text-slate-700 break-keep">
                                  {String(
                                    it?.text ||
                                      it?.word ||
                                      it?.prompt ||
                                      it?.targetText ||
                                      "...",
                                  )}
                                </p>

                                {it?.userImage && (
                                  <div className="mt-2 h-24 bg-slate-50 border border-slate-200 rounded-md overflow-hidden flex items-center justify-center">
                                    <img
                                      src={it.userImage}
                                      alt="writing-result"
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                )}

                                {it?.audioUrl && (
                                  <button
                                    type="button"
                                    onClick={() => playAudio(it.audioUrl, pid)}
                                    className="mt-2 w-full py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-black text-slate-700 transition-colors"
                                  >
                                    {playingId === pid ? "Playing..." : "Play Audio"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading report...</div>}>
      <ReportContent />
    </Suspense>
  );
}
