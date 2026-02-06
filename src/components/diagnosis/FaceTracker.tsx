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
  const requestRef = useRef<number | null>(null);
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
            requestRef.current = requestAnimationFrame(predict);
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
    // 🔹 landmarkerRef.current가 null인지 엄격히 체크
    if (
      landmarkerRef.current &&
      videoRef.current &&
      videoRef.current.readyState >= 2
    ) {
      try {
        const results = landmarkerRef.current.detectForVideo(
          videoRef.current,
          performance.now(),
        );
        if (results.faceLandmarks?.[0]) {
          const metrics = calculateLipMetrics(results.faceLandmarks[0]);
          if (onMetricsUpdate) onMetricsUpdate(metrics);
        }
      } catch (e) {
        // 일시적인 에러 무시
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="bg-white p-3 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="relative aspect-video bg-neutral-900 rounded-[24px] overflow-hidden border-2 border-gray-50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
        {!isLoaded && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-[10px] font-black animate-pulse uppercase tracking-widest">
              Loading...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
