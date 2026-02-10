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
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDenied, setIsDenied] = useState(false); // ✅ 권한 거부 상태 관리

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

  // ✅ 카메라 및 마이크 권한 요청 함수 (버튼 클릭 시 재시도 가능)
  const requestPermissions = async () => {
    setIsRequesting(true);
    setErr("");

    try {
      // 1. 먼저 브라우저 권한 API로 상태 확인 (선택 사항)
      if (navigator.permissions && navigator.permissions.query) {
        const camStatus = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        if (camStatus.state === "denied") {
          setErr("브라우저 설정에서 카메라 차단을 직접 풀어주셔야 합니다.");
          setIsDenied(true);
          setIsRequesting(false);
          return false;
        }
      }

      // 2. 실제 스트림 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());
      setIsDenied(false);
      setIsRequesting(false);
      return true;
    } catch (error: any) {
      console.error("Permission error:", error);
      setIsDenied(true);
      setIsRequesting(false);

      // 에러 종류에 따른 메시지 세분화
      if (error.name === "NotAllowedError") {
        setErr("권한이 거부되었습니다. 주소창의 자물쇠 아이콘을 확인하세요.");
      } else if (error.name === "NotFoundError") {
        setErr("카메라 또는 마이크 하드웨어를 찾을 수 없습니다.");
      } else if (error.name === "NotReadableError") {
        setErr("카메라가 다른 프로그램(줌, 카톡 등)에서 사용 중입니다.");
      } else {
        setErr("장치 접근 중 오류가 발생했습니다.");
      }
      return false;
    }
  };

  const start = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("성명을 입력해 주세요.");
    if (!form.age) return setErr("나이를 입력해 주세요.");
    if (form.gender === "U") return setErr("성별을 선택해 주세요.");

    const hasPermission = await requestPermissions();

    if (hasPermission) {
      savePatientProfile({
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone || undefined,
        hand: "U",
        language: "한국어",
      });
      router.push("/select");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-2 border-[#DAA520]/10">
        {/* 왼쪽 섹션: 입력 폼 */}
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

          {/* 권한 안내 박스 */}
          <div
            className={`mt-8 p-5 rounded-2xl border flex items-start gap-4 transition-colors ${isDenied ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}
          >
            <span className="text-2xl">{isDenied ? "🛑" : "🛡️"}</span>
            <div className="space-y-1">
              <p
                className={`text-xs font-bold ${isDenied ? "text-red-600" : "text-gray-600"}`}
              >
                {isDenied
                  ? "권한 허용이 필요합니다"
                  : "카메라 및 마이크 권한 안내"}
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {isDenied
                  ? "차단된 권한을 직접 해제해야 합니다. 주소창 왼쪽 자물쇠 아이콘을 클릭하여 카메라와 마이크를 '허용'으로 변경해주세요."
                  : "정확한 분석을 위해 학습 시작 시 브라우저 상단의 허용 버튼을 반드시 눌러주세요."}
              </p>
            </div>
          </div>

          {err && (
            <p className="mt-4 text-red-500 font-bold text-sm">⚠️ {err}</p>
          )}

          {/* ✅ 버튼 섹션: 권한 거부 시 '재시도 버튼'으로 교체 */}
          <div className="mt-8">
            {isDenied ? (
              <div className="space-y-3">
                <button
                  onClick={requestPermissions}
                  className="w-full bg-red-500 text-white py-6 rounded-3xl text-xl font-black shadow-xl hover:bg-red-600 active:scale-95 transition-all"
                >
                  권한 다시 요청하기
                </button>
                <p className="text-center text-[10px] text-gray-400 italic">
                  * 다시 요청해도 반응이 없다면 브라우저 설정에서 권한을
                  수동으로 풀어야 합니다.
                </p>
              </div>
            ) : (
              <button
                onClick={start}
                disabled={isRequesting}
                className={`w-full bg-[#8B4513] text-white py-6 rounded-3xl text-2xl font-black shadow-xl hover:bg-[#6D3610] active:scale-95 transition-all ${
                  isRequesting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isRequesting ? "권한 확인 중..." : "학습 시작하기"}
              </button>
            )}
          </div>
        </section>

        {/* 오른쪽 사이드바: 분석 정보 */}
        <aside className="flex-1 bg-[#1A1A1A] p-12 text-white flex flex-col justify-between">
          <div className="space-y-8">
            <h2 className="text-2xl font-bold leading-tight">
              SaMD 데이터 기반
              <br />
              언어 지수 분석
            </h2>
            <div className="bg-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">연령 기준</span>
                <span className="text-[#DAA520] font-black">
                  {form.age && Number(form.age) >= 65
                    ? "65세 이상 군"
                    : "65세 미만 군"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-4 text-sm">
                <span className="text-gray-500 font-bold">
                  K-WAB 규준(평균)
                </span>
                <span className="text-white font-mono">
                  {form.age && Number(form.age) >= 65 ? "88.09" : "90.73"}
                </span>
              </div>
            </div>

            {/* 자물쇠 가이드 이미지 (필요시 삽입) */}
            {isDenied && (
              <div className="mt-4 p-4 border border-white/10 rounded-2xl bg-white/5 animate-pulse text-center">
                <p className="text-[10px] text-[#DAA520] font-bold mb-1">
                  💡 해결 가이드
                </p>
                <p className="text-[9px] text-gray-400">
                  주소창 옆 [자물쇠] → [권한 재설정] 클릭
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed italic border-t border-white/5 pt-6">
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
