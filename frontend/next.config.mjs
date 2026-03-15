/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  env: {
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  }
};

export default nextConfig;

