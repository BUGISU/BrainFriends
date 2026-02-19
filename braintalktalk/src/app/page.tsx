"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { savePatientProfile, loadPatientProfile } from "@/lib/patientStorage";

type Gender = "M" | "F" | "U";
type Hemiplegia = "Y" | "N";
type Hemianopsia = "NONE" | "RIGHT" | "LEFT";

interface FormState {
  name: string;
  birthDate: string;
  age: string;
  educationYears: string;
  gender: Gender;
  onsetDate: string;
  hemiplegia: Hemiplegia;
  hemianopsia: Hemianopsia;
}

export default function HomePage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  const [form, setForm] = useState<FormState>(() => {
    const prev = loadPatientProfile();
    return {
      name: prev?.name ?? "",
      birthDate: prev?.birthDate ?? "",
      age: prev?.age ? String(prev.age) : "",
      educationYears: prev?.educationYears ? String(prev.educationYears) : "",
      gender: (prev?.gender as Gender) ?? "U",
      onsetDate: prev?.onsetDate ?? "",
      hemiplegia: (prev?.hemiplegia as Hemiplegia) ?? "N",
      hemianopsia: (prev?.hemianopsia as Hemianopsia) ?? "NONE",
    };
  });

  const calcDaysSinceOnset = (onsetDate: string): number | null => {
    if (!onsetDate) return null;
    const onset = new Date(`${onsetDate}T00:00:00`);
    if (Number.isNaN(onset.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - onset.getTime();
    return diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getTodayLocalDate = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
  };

  const todayLocalDate = getTodayLocalDate();
  const daysSinceOnset = calcDaysSinceOnset(form.onsetDate);

  const updateForm = (key: keyof FormState, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setIsDenied(false);
      setIsRequesting(false);
      return true;
    } catch (error: any) {
      setIsDenied(true);
      setIsRequesting(false);
      setErr("카메라 및 마이크 접근 권한이 필요합니다.");
      return false;
    }
  };

  const start = async () => {
    if (
      !form.name.trim() ||
      !form.birthDate ||
      !form.age ||
      form.gender === "U" ||
      !form.educationYears ||
      !form.onsetDate
    ) {
      return setErr("모든 필수 항목(*)을 입력해 주세요.");
    }
    if (form.onsetDate > todayLocalDate) {
      return setErr("발병일은 오늘 이후 날짜를 선택할 수 없습니다.");
    }
    if (form.birthDate > todayLocalDate) {
      return setErr("생년월일은 오늘 이후 날짜를 선택할 수 없습니다.");
    }
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      savePatientProfile({
        ...form,
        age: Number(form.age),
        educationYears: Number(form.educationYears),
        daysSinceOnset: daysSinceOnset ?? undefined,
        hand: "U",
        language: "한국어",
      });
      router.push("/select");
    }
  };

  return (
    <main className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 text-black font-sans">
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row border border-white/20">
        {/* Left Section: Registration Form */}
        <section className="flex-[1.6] p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 bg-[#8B4513] rounded-lg flex items-center justify-center text-white font-bold">
                B
              </span>
              <h1 className="text-3xl font-extrabold text-[#2D3436] tracking-tight">
                브레인톡톡
              </h1>
            </div>
            <p className="text-[#DAA520] font-bold uppercase tracking-[0.2em] text-[10px]">
              Patient Clinical Data Setup
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {/* 1행: 성명 & 성별 */}
            <Field label="학습자 성명 *">
              <input
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                className="input-style"
                placeholder="성명을 입력하세요"
              />
            </Field>

            <Field label="생년월일 *">
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => updateForm("birthDate", e.target.value)}
                className="input-style"
                max={todayLocalDate}
              />
            </Field>

            <Field label="성별 *">
              <div className="flex p-1 bg-gray-100 rounded-xl h-[48px]">
                {(["M", "F"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateForm("gender", g)}
                    className={`flex-1 rounded-lg text-sm font-bold transition-all ${form.gender === g ? "bg-white text-[#8B4513] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    {g === "M" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </Field>

            {/* 2행: 나이 & 교육년수 (가로 배치) */}
            <Field label="나이 / 교육년수 *">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    value={form.age}
                    onChange={(e) =>
                      updateForm("age", e.target.value.replace(/\D/g, ""))
                    }
                    className="input-style w-full pr-8"
                    placeholder="나이"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">
                    세
                  </span>
                </div>
                <div className="relative flex-1">
                  <input
                    value={form.educationYears}
                    onChange={(e) =>
                      updateForm(
                        "educationYears",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    className="input-style w-full pr-8"
                    placeholder="교육년수"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">
                    년
                  </span>
                </div>
              </div>
            </Field>

            {/* 3행: 발병일 및 경과일 (가로 배치) */}
            <Field label="발병일 및 경과일 *">
              <div className="flex gap-3">
                <input
                  type="date"
                  value={form.onsetDate}
                  onChange={(e) => updateForm("onsetDate", e.target.value)}
                  className="input-style flex-[1.4] w-full"
                  max={todayLocalDate}
                />
                <div
                  className={`flex-1 flex items-center justify-center rounded-xl font-black text-xs transition-all ${
                    daysSinceOnset !== null
                      ? "bg-[#8B4513] text-white"
                      : "bg-gray-50 text-gray-300 border-2 border-dashed border-gray-100"
                  }`}
                >
                  {daysSinceOnset !== null ? `D+${daysSinceOnset}` : "경과일"}
                </div>
              </div>
            </Field>

            {/* 4행: 편마비 & 반맹증 */}
            <Field label="편마비 유무 *">
              <div className="flex gap-2 h-[48px]">
                {[
                  { k: "Y", l: "있음" },
                  { k: "N", l: "없음" },
                ].map((item) => (
                  <button
                    key={item.k}
                    onClick={() =>
                      updateForm("hemiplegia", item.k as Hemiplegia)
                    }
                    className={`flex-1 rounded-xl text-sm font-bold border-2 transition-all ${form.hemiplegia === item.k ? "border-[#DAA520] bg-[#FFFBEB] text-[#8B4513]" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="반맹증(시야 결손) *">
              <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl h-[48px]">
                {[
                  { k: "NONE", l: "없음" },
                  { k: "LEFT", l: "좌측" },
                  { k: "RIGHT", l: "우측" },
                ].map((item) => (
                  <button
                    key={item.k}
                    onClick={() =>
                      updateForm("hemianopsia", item.k as Hemianopsia)
                    }
                    className={`flex-1 rounded-lg text-[11px] font-bold transition-all ${form.hemianopsia === item.k ? "bg-white text-[#8B4513] shadow-sm" : "text-gray-400"}`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div
            className={`mt-8 p-4 rounded-2xl border flex items-center gap-4 transition-all ${isDenied ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${isDenied ? "bg-white text-red-500" : "bg-white text-blue-500"}`}
            >
              {isDenied ? "!" : "i"}
            </div>
            <div className="flex-1">
              <p
                className={`text-xs font-bold ${isDenied ? "text-red-700" : "text-blue-700"}`}
              >
                {isDenied ? "권한 재설정 필요" : "시스템 하드웨어 체크"}
              </p>
              <p className="text-[10px] text-gray-500 opacity-80 leading-tight">
                발화 분석을 위해 주소창 왼쪽 자물쇠 버튼을 눌러 카메라/마이크를
                허용해 주세요.
              </p>
            </div>
          </div>

          {err && (
            <p className="mt-4 text-center text-red-500 font-bold text-xs animate-bounce">
              ⚠️ {err}
            </p>
          )}

          <button
            onClick={start}
            disabled={isRequesting}
            className={`mt-6 w-full py-5 rounded-2xl text-xl font-black shadow-[0_10px_20px_rgba(139,69,19,0.2)] transition-all active:scale-95 ${isRequesting ? "bg-gray-400 cursor-not-allowed" : "bg-[#8B4513] hover:bg-[#6D3610] text-white"}`}
          >
            {isRequesting ? "연결 확인 중..." : "학습 대시보드 진입"}
          </button>
        </section>

        {/* Right Section: Information Aside */}
        <aside className="flex-[0.8] bg-[#2D3436] p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#DAA520] opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-2xl font-bold leading-snug">
              실시간
              <br />
              <span className="text-[#DAA520]">언어 재활</span> 분석 시스템
            </h2>

            <div className="space-y-4">
              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/5">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">
                  K-WAB Normal Range
                </p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-mono font-bold">
                    {form.age && Number(form.age) >= 65 ? "88.09" : "90.73"}
                  </span>
                  <span className="text-[10px] text-[#DAA520] mb-1">
                    정상군 평균 지수
                  </span>
                </div>
              </div>

              <ul className="text-[11px] text-gray-400 space-y-2 ml-1">
                <li className="flex gap-2">
                  <span>•</span> 교육년수 기반 맞춤 문항 제공
                </li>
                <li className="flex gap-2">
                  <span>•</span> 시야 결손 방향 대응 UI 적용
                </li>
                <li className="flex gap-2">
                  <span>•</span> 발병 경과일별 회복 곡선 추적
                </li>
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 italic border-t border-white/10 pt-6">
            Designed for Clinical Speech Rehabilitation
          </p>
        </aside>
      </div>

      <style jsx>{`
        .input-style {
          background: #f9fafb;
          border: 2px solid #f1f2f6;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .input-style:focus {
          border-color: #daa520;
          background: white;
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.1);
          outline: none;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-extrabold text-[#8B4513] tracking-tight uppercase opacity-80">
        {label}
      </label>
      {children}
    </div>
  );
}
