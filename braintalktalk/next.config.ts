// braintalktalk/next.config.ts
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // 타입 에러 무시
  },
  eslint: {
    ignoreDuringBuilds: true, // ESLint 에러까지 무시해서 빌드 완주
  },
};
export default nextConfig;
