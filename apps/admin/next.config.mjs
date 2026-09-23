/** @type {import('next').NextConfig} */

// Same-origin API proxy target. vercel.app is a public suffix, so the admin
// panel subdomain and the API are different sites. Proxying /api/v1, /api/auth
// and /health through the panel origin keeps Google OAuth + HttpOnly session
// cookies first-party ("first-party" relative to the admin panel host) and
// immune to third-party cookie blocking. Override with ADMIN_API_PROXY_TARGET
// when self-hosting.
const API_PROXY_TARGET =
  process.env.ADMIN_API_PROXY_TARGET ?? 'https://smm-pannel-api.vercel.app';

const nextConfig = {
  transpilePackages: ['@smm/ui', '@smm/types'],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${API_PROXY_TARGET}/api/auth/:path*`,
      },
      {
        source: '/health',
        destination: `${API_PROXY_TARGET}/health`,
      },
    ];
  },
};

export default nextConfig;
