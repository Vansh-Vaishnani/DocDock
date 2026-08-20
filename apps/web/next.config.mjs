/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is ONLY needed when building inside Docker/Kubernetes container images.
  // For Vercel or standard node deployments, leave output undefined to allow Vercel serverless routing.
  output: process.env.IS_DOCKER === 'true' || process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
};

export default nextConfig;