/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sih/ui", "@sih/types"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
