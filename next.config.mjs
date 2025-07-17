/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during build to ignore warnings and errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build for now
    ignoreBuildErrors: false,
  },
};

export default nextConfig; 