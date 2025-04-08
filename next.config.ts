import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bbs.ruliweb.com",
      },
      {
        protocol: "https",
        hostname: "i1.ruliweb.com",
      },
      {
        protocol: "https",
        hostname: "i2.ruliweb.com",
      },
      {
        protocol: "https",
        hostname: "i3.ruliweb.com",
      },
    ],
  },
};

export default nextConfig;
