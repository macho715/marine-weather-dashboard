/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' to enable API routes
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  }
}

export default nextConfig
