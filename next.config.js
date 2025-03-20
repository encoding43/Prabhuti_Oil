/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config...
  transpilePackages: ['@mui/x-date-pickers'],
  images: {
    unoptimized: true
    // Add other image configurations if needed
  }
}

module.exports = nextConfig
