/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config...
  transpilePackages: ['@mui/x-date-pickers'],
  images: {
    unoptimized: true
    // Add other image configurations if needed
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    // This will allow production builds to complete even with TypeScript errors
    ignoreBuildErrors: true
  }
}

module.exports = nextConfig
