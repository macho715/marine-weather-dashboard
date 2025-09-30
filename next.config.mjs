/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Static export 제거 - API Routes 활성화
  trailingSlash: false, // API 라우트 호환성을 위해 false로 변경
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
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'localhost:3002', 'marine-weather-dashboard.vercel.app']
    }, // Server Actions 활성화
  },
  // Vercel 최적화 설정
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
}

export default nextConfig
