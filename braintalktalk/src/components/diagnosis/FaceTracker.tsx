"use client";
import React, { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { calculateLipMetrics, LipMetrics } from "@/utils/faceAnalysis";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  maxFps?: number;
  onReady?: () => void;
  onFaceDetected?: (detected: boolean) => void;
  onFrameLatency?: (ms: number) => void;
  onMetricsUpdate?: (metrics: LipMetrics) => void;
};

export default function FaceTracker({
  videoRef,
  canvasRef,
  maxFps = 30,
  onReady,
  onFaceDetected,
  onFrameLatency,
  onMetricsUpdate,
}: Props) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTickRef = useRef(0);
  const lastFaceDetectedRef = useRef(false);

  // ✅ 사진 느낌의 깔끔한 윤곽선 드로잉 로직
  const drawLandmarks = (face: any[]) => {
    if (!canvasRef?.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== videoRef.current.videoWidth) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    // 1. 주요 골격 (눈, 코, 얼굴형 외곽 - 깔끔한 블루톤)
    drawingUtils.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
      color: "#60A5FA80",
      lineWidth: 1.5,
    });

    // 2. 입술 강조 (훈련 포인트 - 오렌지)
    drawingUtils.drawConnectors(face, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: "#FB923C",
      lineWidth: 2.5,
    });

    // 3. 테크니컬 포인트 (흰색 작은 점)
    drawingUtils.drawLandmarks(face, {
      color: "#FFFFFF",
      lineWidth: 1,
      radius: 1,
    });
  };

  const tick = () => {
    const now = performance.now();
    const minInterval = 1000 / Math.max(1, maxFps);
    if (now - lastTickRef.current < minInterval) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const landmarker = landmarkerRef.current;
    const video = videoRef.current;

    if (
      landmarker &&
      video &&
      video.readyState >= 2 &&
      now > lastTickRef.current
    ) {
      try {
        const results = landmarker.detectForVideo(video, Math.round(now));
        const face = results.faceLandmarks?.[0];
        const detected = !!face;

        if (detected !== lastFaceDetectedRef.current) {
          lastFaceDetectedRef.current = detected;
          onFaceDetected?.(detected);
        }
        if (detected && face) {
          onMetricsUpdate?.(calculateLipMetrics(face));
          drawLandmarks(face);
        } else if (!detected && canvasRef?.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        }
        lastTickRef.current = now;
      } catch (err) {
        console.warn("Skip:", err);
      }
    }
    onFrameLatency?.(performance.now() - now);
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            onReady?.();
            videoRef.current?.play();
            tick();
          };
        }
      } catch (e) {
        console.error("Init Error:", e);
      }
    };
    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return null;
}
