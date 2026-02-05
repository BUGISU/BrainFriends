// src/components/diagnosis/FaceTracker.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateLipMetrics, LipMetrics } from "@/utils/faceAnalysis";

interface FaceTrackerProps {
  onMetricsUpdate?: (metrics: LipMetrics) => void;
}

export default function FaceTracker({ onMetricsUpdate }: FaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null); // ✅ requestRef 선언 추가
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        const instance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        if (!isMounted) return;
        landmarkerRef.current = instance;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { aspectRatio: 1.777 },
        });

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsLoaded(true);
            requestRef.current = requestAnimationFrame(predict); // ✅ 시작
          };
        }
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
      }
    }
    init();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const predict = () => {
    // 🔹 TypeScript 에러 방지용 가드: 변수에 담아서 null 체크
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    // Optional Chaining(?) 대신 명확한 비교 연산 사용
    if (landmarker && video && video.readyState >= 2) {
      const results = landmarker.detectForVideo(video, performance.now());

      if (results.faceLandmarks?.[0]) {
        const metrics = calculateLipMetrics(results.faceLandmarks[0]);
        if (onMetricsUpdate) onMetricsUpdate(metrics);
      }
    }

    // 무한 루프 재귀 호출
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-black text-neutral-800 tracking-tighter">
            모니터링
          </h3>
          <p className="text-[12px] font-bold text-neutral-400 uppercase italic mt-1">
            SPEECH REHAB TRACKING
          </p>
        </div>
      </div>

      <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden border-4 border-gray-50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />

        {/* 가이드라인 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[1px] h-2/3 border-l border-dashed border-green-400/50" />
          <div className="absolute w-24 h-12 border-2 border-green-400/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
