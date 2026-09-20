/** @type {import('next').NextConfig} */

// Same-origin API proxy target. vercel.app is a public suffix, so the panel and
// the API are different sites; proxying /api/v1 through the panel origin keeps
// the HttpOnly session cookies first-party and immune to third-party cookie
// blocking. Override with SUPER_ADMIN_API_PROXY_TARGET when self-hosting.
const API_PROXY_TARGET =
  process.env.SUPER_ADMIN_API_PROXY_TARGET ?? 'https://smm-pannel-api.vercel.app';

const nextConfig = {
  transpilePackages: ['@smm/ui', '@smm/types'],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
