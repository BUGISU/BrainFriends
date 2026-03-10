// braintalktalk/next.config.ts
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // 타입 에러 무시
  },
  async redirects() {
    return [
      { source: "/mode-select", destination: "/select-page/mode", permanent: false },
      { source: "/select", destination: "/select-page/self-assessment", permanent: false },
      { source: "/rehab", destination: "/select-page/speech-rehab", permanent: false },
      { source: "/select-sing", destination: "/select-page/sing-training", permanent: false },
      { source: "/brain-sing", destination: "/programs/sing-training", permanent: false },
      { source: "/step-1", destination: "/programs/step-1", permanent: false },
      { source: "/step-2", destination: "/programs/step-2", permanent: false },
      { source: "/step-3", destination: "/programs/step-3", permanent: false },
      { source: "/step-4", destination: "/programs/step-4", permanent: false },
      { source: "/step-5", destination: "/programs/step-5", permanent: false },
      { source: "/step-6", destination: "/programs/step-6", permanent: false },
      { source: "/result", destination: "/result-page/self-assessment", permanent: false },
      { source: "/result-rehab", destination: "/result-page/speech-rehab", permanent: false },
    ];
  },
};
export default nextConfig;
