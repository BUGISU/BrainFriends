// src/app/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { savePatientProfile, loadPatientProfile } from "@/lib/patientStorage";

type Gender = "M" | "F" | "U";

interface FormState {
  name: string;
  age: string;
  gender: Gender;
  phone: string;
}

export default function HomePage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [isRequesting, setIsRequesting] = useState(false); // 권한 요청 중 로딩 상태

  const [form, setForm] = useState<FormState>(() => {
    const prev = loadPatientProfile();
    return {
      name: prev?.name ?? "",
      age: prev?.age ? String(prev.age) : "",
      gender: (prev?.gender as Gender) ?? "U",
      phone: prev?.phone ?? "",
    };
  });

  const formatPhone = (val: string): string => {
    const nums = val.replace(/[^\d]/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const handleNameChange = (v: string) => setForm((p) => ({ ...p, name: v }));
  const handleAgeChange = (v: string) =>
    setForm((p) => ({ ...p, age: v.replace(/[^\d]/g, "") }));
  const handleGenderChange = (v: Gender) =>
    setForm((p) => ({ ...p, gender: v }));
  const handlePhoneChange = (v: string) =>
    setForm((p) => ({ ...p, phone: formatPhone(v) }));

  // ✅ 카메라 및 마이크 권한 요청 함수
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // 권한 획득 성공 시 스트림 즉시 종료 (권한만 확보)
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Permission denied:", error);
      return false;
    }
  };

  const start = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("성명을 입력해 주세요.");
    if (!form.age) return setErr("나이를 입력해 주세요.");
    if (form.gender === "U") return setErr("성별을 선택해 주세요.");

    setIsRequesting(true);

    // ✅ 학습 시작 전 카메라/마이크 권한 먼저 확인
    const hasPermission = await requestPermissions();

    if (!hasPermission) {
      setIsRequesting(false);
      return setErr("카메라와 마이크 권한을 허용해야 학습 진행이 가능합니다.");
    }

    savePatientProfile({
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      phone: form.phone || undefined,
      hand: "U",
      language: "한국어",
    });

    router.push("/select");
  };

  return (
    <main className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-2 border-[#DAA520]/10">
        <section className="flex-[1.8] p-12">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-[#8B4513]">브레인톡톡</h1>
            <p className="text-[#DAA520] font-bold mt-2 uppercase tracking-widest text-sm">
              Patient Registration & Setup
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Field label="학습자 성명 *">
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-style"
                placeholder="홍길동"
              />
            </Field>

            <Field label="학습자 나이 *">
              <input
                value={form.age}
                onChange={(e) => handleAgeChange(e.target.value)}
                className="input-style"
                placeholder="숫자만"
                inputMode="numeric"
              />
            </Field>

            <Field label="성별 *">
              <div className="flex gap-2">
                {(["M", "F"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGenderChange(g)}
                    className={`flex-1 py-4 rounded-2xl font-black transition-all ${
                      form.gender === g
                        ? "bg-[#DAA520] text-white shadow-lg"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {g === "M" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="연락처 (자동 하이픈)">
              <input
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="input-style"
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </Field>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <p className="text-xs text-gray-500 leading-tight">
              학습 시작 시 <strong>카메라 및 마이크 권한</strong>을 요청합니다.
              <br />
              정확한 분석을 위해 반드시 &quot;허용&quot;을 눌러주세요.
            </p>
          </div>

          {err && (
            <p className="mt-6 text-red-500 font-bold text-sm animate-pulse">
              ⚠️ {err}
            </p>
          )}

          <button
            onClick={start}
            disabled={isRequesting}
            className={`w-full mt-10 bg-[#8B4513] text-white py-6 rounded-3xl text-2xl font-black shadow-xl hover:bg-[#6D3610] active:scale-95 transition-all ${
              isRequesting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isRequesting ? "권한 확인 중..." : "학습 시작하기"}
          </button>
        </section>

        <aside className="flex-1 bg-[#1A1A1A] p-12 text-white flex flex-col justify-between">
          <div className="space-y-8">
            <h2 className="text-2xl font-bold leading-tight">
              SaMD 데이터 기반
              <br />
              언어 지수 분석
            </h2>
            <div className="bg-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs font-bold">
                  연령 기준
                </span>
                <span className="text-[#DAA520] font-black text-sm">
                  {form.age && Number(form.age) >= 65
                    ? "65세 이상 군"
                    : "65세 미만 군"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <span className="text-gray-500 text-xs font-bold">
                  K-WAB 규준(평균)
                </span>
                <span className="text-white font-mono text-sm">
                  {form.age && Number(form.age) >= 65 ? "88.09" : "90.73"}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed italic">
            * 본 시스템은 한국판 웨스턴 실어증 검사(K-WAB)의 정상군 데이터를
            기준으로 분석을 수행합니다.
          </p>
        </aside>
      </div>

      <style jsx>{`
        .input-style {
          width: 100%;
          padding: 1.2rem 1.5rem;
          font-size: 1.1rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 1.25rem;
          outline: none;
          color: black;
        }
        .input-style:focus {
          border-color: #daa520;
          background: white;
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
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-black text-[#8B4513] ml-1">{label}</label>
      {children}
    </div>
  );
}
