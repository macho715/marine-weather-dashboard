/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Static export 제거 - API Routes 활성화
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: false, // 린트 활성화
  },
  typescript: {
    ignoreBuildErrors: false, // 타입 체크 활성화
  },
  images: {
    unoptimized: false, // sharp 최적화 활성화
    domains: ['api.example.com', 'open-meteo.com'], // 외부 이미지 도메인
  },
  experimental: {
    serverActions: true, // Server Actions 활성화
  },
}

export default nextConfig
