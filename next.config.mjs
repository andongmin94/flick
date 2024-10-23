/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i2.ruliweb.com',
      },
      {
        protocol: 'https',
        hostname: 'i3.ruliweb.com',
      },
      {
        protocol: 'https',
        hostname: 'ssl.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: 'i1.ruliweb.com',
      },
      {
        protocol: 'https',
        hostname: 'bbs.ruliweb.com',
      },
      {
        protocol: 'https',
        hostname: 'image.fmkorea.com',
      },
    ],
  },
};

export default nextConfig;