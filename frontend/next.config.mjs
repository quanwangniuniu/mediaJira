/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  eslint: {
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
