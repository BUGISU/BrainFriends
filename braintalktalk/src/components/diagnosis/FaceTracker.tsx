"use client";

import React, { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { calculateLipMetrics, LipMetrics } from "@/utils/faceAnalysis";

const TFLITE_XNNPACK_INFO = "Created TensorFlow Lite XNNPACK delegate for CPU";

function hasNoisyTfliteMessage(value: unknown): boolean {
  if (typeof value === "string") return value.includes(TFLITE_XNNPACK_INFO);
  if (value instanceof Error) return value.message.includes(TFLITE_XNNPACK_INFO);
  return false;
}

// ✅ 타입을 확장해서 landmarks를 포함시킵니다.
interface ExtendedMetrics extends LipMetrics {
  landmarks: any[];
}

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  maxFps?: number;
  onReady?: () => void;
  onMetricsUpdate: (metrics: ExtendedMetrics) => void; // ✅ 변경
};

export default function FaceTracker({
  videoRef,
  canvasRef,
  maxFps = 30,
  onReady,
  onMetricsUpdate,
}: Props) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const tick = () => {
    const now = performance.now();
    const minInterval = 1000 / Math.max(1, maxFps);

    if (now - lastTickRef.current < minInterval) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (
      landmarkerRef.current &&
      videoRef.current &&
      videoRef.current.readyState >= 2
    ) {
      try {
        const results = landmarkerRef.current.detectForVideo(
          videoRef.current,
          Math.round(now),
        );
        const face = results.faceLandmarks?.[0];

        if (face) {
          if (now - lastUpdateRef.current > 100) {
            // ✅ 수치 데이터와 좌표 데이터를 합쳐서 보냅니다.
            const metrics = calculateLipMetrics(face);
            onMetricsUpdate({
              ...metrics,
              landmarks: face, // 👈 이게 있어야 사이드바가 그림을 그립니다.
            });
            lastUpdateRef.current = now;
          }
        }
        lastTickRef.current = now;
      } catch (err) {
        if (hasNoisyTfliteMessage(err)) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        console.warn("Analysis skip:", err);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let cancelled = false;
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      if (args.some(hasNoisyTfliteMessage)) return;
      originalConsoleError(...args);
    };

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        if (cancelled) return;

        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (videoRef.current && !cancelled) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            onReady?.();
            tick();
          };
        }
      } catch (error) {
        console.error("FaceTracker 초기화 실패:", error);
      }
    };

    init();
    return () => {
      cancelled = true;
      console.error = originalConsoleError;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return null;
}
