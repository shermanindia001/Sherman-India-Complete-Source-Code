/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      '.prisma/client',
      '@prisma/adapter-neon',
      '@neondatabase/serverless',
      '@prisma/adapter-pg',
      'pg',
    ],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.aryawebsolutions.online',
      },
      {
        protocol: 'https',
        hostname: 'aryawebsolutions.online',
      },
      {
        protocol: 'http',
        hostname: 'www.aryawebsolutions.online',
      },
      {
        protocol: 'http',
        hostname: 'aryawebsolutions.online',
      },
      {
        protocol: 'https',
        hostname: 'sherman-india.com',
      },
      {
        protocol: 'https',
        hostname: 'www.sherman-india.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'cloudflare:sockets'];
    }
    return config;
  },
};

export default nextConfig;
