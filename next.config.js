/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  // This creates a minimal production build with only necessary files
  output: 'standalone',

  // Disable image optimization for smaller Docker images
  // Re-enable if you need Next.js Image Optimization
  images: {
    unoptimized: true,
  },

  // Compress pages for better performance
  compress: true,

  // Disable powered by header for security
  poweredByHeader: false,

  // Environment variables to expose to the browser (if needed)
  env: {
    // Add any public env vars here
  },

  // Webpack configuration (if needed)
  webpack: (config, { isServer }) => {
    // Custom webpack config here if needed
    return config;
  },
}

module.exports = nextConfig;
