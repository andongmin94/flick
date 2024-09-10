import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flick",
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
      <body className="bg-gray-700">
        <div className="w-[515px] mx-auto text-foreground">{children}</div>
      </body>
    </html>
  );
}
