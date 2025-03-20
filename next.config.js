/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config...
  transpilePackages: ['@mui/x-date-pickers'],
  images: {
    unoptimized: true
    // Add other image configurations if needed
  },
  eslint: {
    ignoreDuringBuilds: true // Disables ESLint errors during the build process
  }
}

module.exports = nextConfig
