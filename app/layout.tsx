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
      <body>
        <div className="max-w-4xl mx-auto bg-background text-foreground p-4">
          {children}
        </div>
      </body>
    </html>
  );
}
