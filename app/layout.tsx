import type { Metadata } from "next";

import "./globals.css";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name}`,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: [
    {
      name: "andongmin",
    },
  ],
  creator: "andongmin",
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@andongmin94",
  },
  icons: [
    { rel: "icon", url: "/flick.svg" },
    { rel: "apple-touch-icon", url: "/flick.svg" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className="h-[100.1vh] bg-[#F3FAFF]">
        <div className="text-foreground mx-auto w-[26.9vw]">{children}</div>
      </body>
    </html>
  );
}
