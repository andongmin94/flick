import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "안동민의 Flick",
  icons: [
    { rel: "icon", url: '/flick.svg' },
    { rel: "apple-touch-icon", url: '/flick.svg' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
